'use strict';

const express = require('express');
const path = require('path');
const catalyst = require('zcatalyst-sdk-node');

const app = express();

const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 9000;

const EMPLOYEE_TABLE = 'Employee';
const COUNTER_TABLE = 'Counters';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Employee API is running'
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crud.html'));
});

function getCatalystApp(req) {
  return catalyst.initialize(req);
}

function getEmployeeTable(req) {
  return getCatalystApp(req).datastore().table(EMPLOYEE_TABLE);
}

function cleanText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function cleanNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  return Number(value);
}

async function generateEmployeeNo(catalystApp) {
  const table = catalystApp.datastore().table(COUNTER_TABLE);

  const rows = await table.getAllRows();
  const counterRow = rows.find(row => row.prefix === 'EMP');

  if (!counterRow) {
    throw new Error('EMP counter not initialized in Counters table');
  }

  const currentValue = Number(counterRow.value) || 0;
  const nextValue = currentValue + 1;

  await table.updateRow({
    ROWID: counterRow.ROWID,
    value: nextValue
  });

  return `EMP-${String(nextValue).padStart(3, '0')}`;
}

app.get('/api/employees', async (req, res) => {
  try {
    const table = getEmployeeTable(req);

    let employees = [];
    let nextToken;

    do {
      const page = await table.getPagedRows({
        next_token: nextToken,
        max_rows: 200
      });

      employees.push(...(page.data || []));
      nextToken = page.next_token;
    } while (nextToken);

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

app.get('/api/employees/:id', async (req, res) => {
  try {
    const table = getEmployeeTable(req);
    const employee = await table.getRow(req.params.id);

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

app.post('/api/employees', async (req, res) => {
  try {
    const catalystApp = getCatalystApp(req);
    const table = getEmployeeTable(req);

    const {
      Name,
      Email,
      MobileNumber,
      AlternateMobileNumber,
      Gender,
      MaritalStatus,
      Nationality,
      DOB,
      BloodGroup,
      EmergencyContactName,
      EmergencyContactNumber,
      Relationship
    } = req.body;

    if (!cleanText(Name) || !cleanText(Email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee Name and Email are required'
      });
    }

    const empNo = await generateEmployeeNo(catalystApp);

    const rowData = {
      EmpNo: empNo,
      Name: cleanText(Name),
      Email: cleanText(Email),
      MobileNumber: cleanText(MobileNumber),
      AlternateMobileNumber: cleanText(AlternateMobileNumber),
      Gender: cleanText(Gender),
      MaritalStatus: cleanText(MaritalStatus),
      Nationality: cleanText(Nationality),
      DOB: cleanText(DOB),
      BloodGroup: cleanText(BloodGroup),
      EmergencyContactName: cleanText(EmergencyContactName),
      EmergencyContactNumber: cleanText(EmergencyContactNumber),
      Relationship: cleanText(Relationship)
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

app.put('/api/employees/:id', async (req, res) => {
  try {
    const table = getEmployeeTable(req);
    const rowId = req.params.id;

    const allowedFields = [
      'Name',
      'Email',
      'MobileNumber',
      'AlternateMobileNumber',
      'Gender',
      'MaritalStatus',
      'Nationality',
      'DOB',
      'BloodGroup',
      'EmergencyContactName',
      'EmergencyContactNumber',
      'Relationship'
    ];

    const updatedRowData = {
      ROWID: rowId
    };

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updatedRowData[field] = cleanText(req.body[field]);
      }
    });

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