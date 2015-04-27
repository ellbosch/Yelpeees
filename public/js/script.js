$(function(){
	// find current location
	get_current_location();


	function get_current_location() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function (position) {
			    var lat = position.coords.latitude;
			    var lng = position.coords.longitude;
			    $("#search-input-location").val(lat + ", " + lng);
			});
		}
	}

	// show search inputs when search button is clicked
	$("#search-box #search-btn").on('click', function() {
		$("#search-fields-div").toggle();
	});


	$("#search-input-btn").on('click', function(event) {
		event.preventDefault();

		// show loading screen
		$("#loading-screen").show();

		var food_input = $("#search-input-food").val().trim();
		var restaurant_input = $("#search-input-restaurant").val().trim();
		var location_input = $("#search-input-location").val().trim();

		if (food_input == "") {
			$("#error").html("Empty Food Field");
		} else {
			$.ajax({
				async: true,
				url: "/search",
				type: "POST",
				data: {
						"food": food_input, 
						"restaurant":  restaurant_input,
						"location": location_input
					},
					success: function(data) {
						var data_result = JSON.parse(data)["data"];
						var reviews_result = JSON.parse(data_result);

						// display data
						if (reviews_result.length > 0) {
							display_food_data(food_input, reviews_result);
						}

					},
					error: function (xhr, ajaxOptions, thrownError) {
						console.log("error");
						$("#error").html(xhr.responseText);
					}
			});
		}
	});


// 	$("#Search").click(function() {
// 		$("#error").html("");
// 		var lat;
// 		var lng;
// 		if (navigator.geolocation) {
// 			navigator.geolocation.getCurrentPosition(function (position) {
// 			    lat = position.coords.latitude;
// 			    lng = position.coords.longitude;

// 			    if ($("input[name='food']").val().trim() == "") {
// 					$("#error").html("Empty Food Field");
// 				}
// 				else {
// 					$.ajax({
// 						async: true,
// 						url: "/search",
// 						type: "POST",
// 						data: 
// 							( $("input[name='location']").val().trim() == "" ? 
// 								{
// 									"food": $("input[name='food']").val(), 
// 									"restaurant":  $("input[name='restaurant']").val(),
// 									"location": lat + "," + lng
// 								} :
// 								{
// 									"food": $("input[name='food']").val(), 
// 									"restaurant":  $("input[name='restaurant']").val(),
// 									"location": $("input[name='location']").val()
// 								}
// 							)
// 					});
// 				}
// 			});
// 		}
// 		else {
// 			if ($("input[name='food']").val().trim() == "") {
// 				$("#error").html("Empty Food Field");
// 			}
// 			else if ($("input[name='location']").val().trim() == "") {
// 				$("#error").html("Empty Location Field");
// 			}
// 			else {
// 				$.ajax({
// 					async: true,
// 					url: "/search",
// 					type: "POST",
// 					data: 
// 						{
// 							"food": $("input[name='food']").val(), 
// 							"restaurant":  $("input[name='restaurant']").val(),
// 							"location": $("input[name='location'])").val()
// 						}
// >>>>>>> c32a05515a0d3f7f056a54f87bc422c1ee3ff6a0
	// 			});
	// 		}
	// 	}
		
	// });
	
	// displays food review data
	function display_food_data(food_input, data) {
		// hide loading screen and search boxes
		$("#loading-screen").hide();
		$("#search-fields-div").hide();


		var restaurant_name = data[0]["NAME"];
		var food_input_cap = food_input.charAt(0).toUpperCase() + food_input.substring(1);

		// set text to search button
		var btn_str = "<strong>" + food_input_cap + "</strong> at <strong>" + restaurant_name + "</strong>"
		$("#search-btn-query").html(btn_str);
	}
	

	// sentiment analysis
	function run_sentiment_analysis(text) {
		$.post("/sentiment", {'text': text}, function(data, status) {
			if (data.success) {
				score = data['result']['score'];
			}
		});
	}
})
