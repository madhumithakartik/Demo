

$(document).ready(function () {
	
	 
        // 1. Initialize the Kendo TextBox
        $("#createIncident").kendoTextBox();

        // 2. Initialize the Kendo Button
        $("#apiButton").kendoButton({
            themeColor: "primary", // Gives the button a primary styling
            click: function(e) {
                
                // Get the value from the Kendo TextBox
                var inputValue = $("#createIncident").val();

                // Basic validation
                if (!inputValue) {
                    kendo.alert("Please enter a value before searching.");
                    return;
                }

             
				var postData = {desc: inputValue}; 
                $.ajax({
                    url: "/incident",
                    type: "POST",
                    dataType: "json",
                    contentType: "application/json; charset=utf-8",
					data: JSON.stringify(postData), // Convert the JavaScript object into a JSON string
					success: function(response) {
					// The server usually returns the created object along with a new ID
					console.log("Post created successfully! New ID:", response.id);
					$("#grid").data("kendoGrid").dataSource.read();
				},
					error: function(xhr, status, error) {
					console.error("An error occurred:", error);
				}
                });
            }
        });
  

  $("#grid").kendoGrid({
    dataSource: {
      transport: {
        read: {
          url: "/incident",  
          dataType: "json"
        }
      },
      schema: {
        data: "result"
      }
    },
    height: 400,
    pageable: true,
    columns: [
      { field: "Incident.ROWID", title: "ID" },
      { field: "Incident.description", title: "Description" }
    ]
  });

});



       