'use strict';

const express = require('express');
const path = require('path');
const catalyst = require('zcatalyst-sdk-node');

const app = express();

// AppSail port
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 9000;

// Change this to your actual Data Store table name
const EMPLOYEE_TABLE = 'Employee';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional: serve static files like crud.html from /public
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Employee API is running'
  });
});

// Optional root route
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'crud.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(200).send('Employee API is running. Open /health or call /api/employees');
    }
  });
});

/**
 * Small helper to get Catalyst table instance for current request
 */
function getEmployeeTable(req) {
  const catalystApp = catalyst.initialize(req);
  const datastore = catalystApp.datastore();
  return datastore.table(EMPLOYEE_TABLE);
}

/**
 * GET /api/employees
 * Returns all employees using paged fetch
 */
app.get('/api/employees', async (req, res) => {
  try {
    const table = getEmployeeTable(req);

    let hasNext = true;
    let nextToken = undefined;
    const employees = [];

    while (hasNext) {
      const page = await table.getPagedRows({
        next_token: nextToken,
        max_rows: 200
      });

      const data = page.data || [];
      employees.push(...data);

      hasNext = !!page.next_token;
      nextToken = page.next_token;
    }

    res.status(200).json({
      status: 'success',
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('GET /api/employees error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch employees'
    });
  }
});

/**
 * GET /api/employees/:id
 * Returns a single employee by ROWID
 */
app.get('/api/employees/:id', async (req, res) => {
  try {
    const table = getEmployeeTable(req);
    const rowId = req.params.id;

    const employee = await table.getRow(rowId);

    res.status(200).json({
      status: 'success',
      data: employee
    });
  } catch (error) {
    console.error('GET /api/employees/:id error:', error);
    res.status(404).json({
      status: 'error',
      message: error.message || 'Employee not found'
    });
  }
});

/**
 * POST /api/employees
 * Creates a new employee
 *
 * Adjust column names below to match your Data Store table exactly.
 * Example columns:
 *  - Name
 *  - Email
 *  - Department
 *  - Designation
 *  - Salary
 */
app.post('/api/employees', async (req, res) => {
  try {
    const table = getEmployeeTable(req);

    const {
      Name,
      Email,
      Department,
      Designation,
      Salary
    } = req.body;

    if (!Name || !Email) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and Email are required'
      });
    }
	
	const catalystApp = catalyst.initialize(req);
	
	const empNo = await generateEmployeeNo(catalystApp);

    const rowData = {
	  EmpNo: empNo, 
      Name,
      Email,
      Department: Department || '',
      Designation: Designation || '',
      Salary: Salary ? Number(Salary) : null
    };

    const insertedRow = await table.insertRow(rowData);

    res.status(201).json({
      status: 'success',
      message: 'Employee created successfully',
      data: insertedRow
    });
  } catch (error) {
    console.error('POST /api/employees error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create employee'
    });
  }
});

/**
 * PUT /api/employees/:id
 * Updates an employee by ROWID
 *
 * ROWID is mandatory for updateRow().
 */
app.put('/api/employees/:id', async (req, res) => {
  try {
    const table = getEmployeeTable(req);
    const rowId = req.params.id;

    const {
      Name,
      Email,
      Department,
      Designation,
      Salary
    } = req.body;

    const updatedRowData = {
      ROWID: rowId
    };

    if (Name !== undefined) updatedRowData.Name = Name;
    if (Email !== undefined) updatedRowData.Email = Email;
    if (Department !== undefined) updatedRowData.Department = Department;
    if (Designation !== undefined) updatedRowData.Designation = Designation;
    if (Salary !== undefined) updatedRowData.Salary = Salary === '' ? null : Number(Salary);

    const updatedRow = await table.updateRow(updatedRowData);

    res.status(200).json({
      status: 'success',
      message: 'Employee updated successfully',
      data: updatedRow
    });
  } catch (error) {
    console.error('PUT /api/employees/:id error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update employee'
    });
  }
});

/**
 * DELETE /api/employees/:id
 * Deletes an employee by ROWID
 */
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const table = getEmployeeTable(req);
    const rowId = req.params.id;

    const deletedRow = await table.deleteRow(rowId);

    res.status(200).json({
      status: 'success',
      message: 'Employee deleted successfully',
      data: deletedRow
    });
  } catch (error) {
    console.error('DELETE /api/employees/:id error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete employee'
    });
  }
});

async function generateEmployeeNo(catalystApp) {
  const datastore = catalystApp.datastore();
  const table = datastore.table('Counters');

  // Fetch current counter
  const rows = await table.getAllRows(); // or use ZCQL if filtering
  const counterRow = rows.find(r => r.prefix === 'EMP');

  if (!counterRow) {
    throw new Error('EMP counter not initialized');
  }

  const currentValue = Number(counterRow.value) || 0;
  const nextValue = currentValue + 1;

  // Update counter
  await table.updateRow({
    ROWID: counterRow.ROWID,
    value: nextValue
  });

  // Format EMP-001
  const empNo = `EMP-${String(nextValue).padStart(3, '0')}`;

  return empNo;
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Employee AppSail server started on port ${PORT}`);
});