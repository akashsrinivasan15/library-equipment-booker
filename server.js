const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// GET /api/equipment
app.get('/api/equipment', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, total_stock, currently_borrowed FROM equipment ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch equipment catalog.' });
  }
});

// GET /api/dashboard - Fetch summary metrics and active checkouts list
app.get('/api/dashboard', async (req, res) => {
  try {
    // 1. Calculate inventory summary stats
    const [summaryRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(total_stock), 0) as totalItems,
        COALESCE(SUM(total_stock - currently_borrowed), 0) as availableItems,
        COALESCE(SUM(currently_borrowed), 0) as checkedOutItems,
        COUNT(id) as equipmentTypes
      FROM equipment
    `);

    // 2. Fetch active checkouts (FIXED: r.created_at as checkout_date)
    const [activeCheckouts] = await pool.query(`
      SELECT 
        r.id as reservation_id,
        r.student_id,
        r.created_at as checkout_date,
        e.name as equipment_name,
        e.id as equipment_id
      FROM reservations r
      JOIN equipment e ON r.equipment_id = e.id
      WHERE r.status = 'active'
      ORDER BY r.created_at DESC
    `);

    res.json({
      summary: summaryRows[0],
      activeCheckouts,
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

// POST /api/reservations
app.post('/api/reservations', async (req, res) => {
  const { studentId, equipmentId } = req.body;

  if (!studentId || !equipmentId) {
    return res.status(400).json({ error: 'Student ID and Equipment ID are required.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Check max limit (2 active items)
    const [activeRes] = await connection.query(
      `SELECT COUNT(*) as activeCount FROM reservations 
       WHERE student_id = ? AND status = 'active'`,
      [studentId]
    );

    if (activeRes[0].activeCount >= 2) {
      await connection.rollback();
      return res.status(400).json({
        error: 'Limit reached: You cannot have more than 2 active reservations.',
      });
    }

    // 2. Check if student already borrowed this specific item
    const [duplicateCheck] = await connection.query(
      `SELECT COUNT(*) as dupCount FROM reservations 
       WHERE student_id = ? AND equipment_id = ? AND status = 'active'`,
      [studentId, equipmentId]
    );

    if (duplicateCheck[0].dupCount >3) {
      await connection.rollback();
      return res.status(400).json({
        error: 'You already have an active checkout for this equipment.',
      });
    }

    // 3. Lock equipment row & check stock
    const [equipRes] = await connection.query(
      `SELECT total_stock, currently_borrowed FROM equipment 
       WHERE id = ? FOR UPDATE`,
      [equipmentId]
    );

    if (equipRes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const { total_stock, currently_borrowed } = equipRes[0];

    if (currently_borrowed >= total_stock) {
      await connection.rollback();
      return res.status(400).json({ error: 'Item is currently out of stock.' });
    }

    // 4. Update equipment stock count
    await connection.query(
      `UPDATE equipment SET currently_borrowed = currently_borrowed + 1 WHERE id = ?`,
      [equipmentId]
    );

    // 5. Insert reservation record
    const [insertResult] = await connection.query(
      `INSERT INTO reservations (student_id, equipment_id, status) VALUES (?, ?, 'active')`,
      [studentId, equipmentId]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Equipment reserved successfully!',
      reservationId: insertResult.insertId,
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error processing reservation.' });
  } finally {
    connection.release();
  }
});

// POST /api/reservations/:id/return
app.post('/api/reservations/:id/return', async (req, res) => {
  const reservationId = req.params.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch reservation
    const [resRows] = await connection.query(
      `SELECT equipment_id, status FROM reservations WHERE id = ? FOR UPDATE`,
      [reservationId]
    );

    if (resRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Reservation record not found.' });
    }

    const { equipment_id, status } = resRows[0];

    if (status !== 'active') {
      await connection.rollback();
      return res.status(400).json({ error: 'This reservation has already been returned.' });
    }

    // 2. Mark reservation returned
    await connection.query(
      `UPDATE reservations SET status = 'returned' WHERE id = ?`,
      [reservationId]
    );

    // 3. Update stock (fixed variable name bug)
    await connection.query(
      `UPDATE equipment SET currently_borrowed = GREATEST(currently_borrowed - 1, 0) WHERE id = ?`,
      [equipment_id]
    );

    await connection.commit();

    res.json({ message: 'Equipment successfully returned.' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error processing return.' });
  } finally {
    connection.release();
  }
});

app.post("/api/reservations/:id/cancel", async (req, res) => {

    const reservationId = req.params.id;

    const connection = await pool.getConnection();

    try{

        await connection.beginTransaction();

        const [rows] = await connection.query(
            `SELECT equipment_id,status
             FROM reservations
             WHERE id=?
             FOR UPDATE`,
            [reservationId]
        );

        if(rows.length===0){

            await connection.rollback();

            return res.status(404).json({
                error:"Reservation not found."
            });

        }

        if(rows[0].status!=="active"){

            await connection.rollback();

            return res.status(400).json({
                error:"Reservation cannot be cancelled."
            });

        }

        await connection.query(
            `UPDATE reservations
            SET status='cancelled',
                cancelled_at=NOW()
            WHERE id=?`,
            [reservationId]
        );

        await connection.query(
            `UPDATE equipment
             SET currently_borrowed=
             GREATEST(currently_borrowed-1,0)
             WHERE id=?`,
            [rows[0].equipment_id]
        );

        await connection.commit();

        res.json({
            message:"Reservation cancelled successfully."
        });

    }catch(err){

        await connection.rollback();

        console.log(err);

        res.status(500).json({
            error:"Server Error"
        });

    }finally{

        connection.release();

    }

});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));