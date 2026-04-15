var express = require('express');
var app = express();
var catalyst = require('zcatalyst-sdk-node');

app.use(express.json());
app.use(express.static('public'));

const tableName = 'Incident'; // The table created in the Data Store
const columnName = 'description'; // The column created in the table
app.post('/incident', (req, res) => {
    var reqJson = req.body;
    console.log(req.body)
    var catalystApp = catalyst.initialize(req);
 
            console.log("creating a incident");
            var rowData = {}
            rowData[columnName] = reqJson.desc;
            var rowArr = [];
            rowArr.push(rowData);
            // Inserts the city name as a row in the Catalyst Data Store table
            catalystApp.datastore().table(tableName).insertRows(rowArr).then(insertResp => {
                res.send({
                    "message": "Thanks for reporting!"
                });
            }).catch(err => {
                console.log(err);
                sendErrorResponse(res);
            })
        
   
});
app.get('/incident', (req, res) => {
   
   console.log("HEADERS:", req.headers);
   console.log("BODY:", req.body);
    var catalystApp = catalyst.initialize(req);
    getDataFromCatalystDataStore(catalystApp).then(details => {
        if (details.length == 0) {
            res.send({             
                "result": "No records"
            });
        } else {
            res.send({             
                "result": details
            });
        }
    }).catch(err => {
        console.log(err);
        sendErrorResponse(res);
    })
});
function getDataFromCatalystDataStore(catalystApp) {
    return new Promise((resolve, reject) => {
        // Queries the Catalyst Data Store table
        catalystApp.zcql().executeZCQLQuery("Select * from " + tableName).then(queryResponse => {
            resolve(queryResponse);
        }).catch(err => {
            reject(err);
        })
    });
}
function sendErrorResponse(res) {
    res.status(500);
    res.send({
        "error": "Internal server error occurred. Please try again in some time."
    });
}
app.listen(process.env.X_ZOHO_CATALYST_LISTEN_PORT || 9000, () => {
})
module.exports = app;