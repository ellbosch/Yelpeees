$(function(){
	// show search inputs when search button is clicked
	$("#search-box #search-btn").on('click', function() {
		$("#search-fields-div").show();
	});


	$("#search-input-btn").on('click', function(event) {
		event.preventDefault();

		// show loading screen
		$("#loading-screen").show();

		var food_input = $("#search-input-food").val().trim();
		var restaurant_input = $("#search-input-place").val();

		if (food_input == "") {
			$("#error").html("Empty Food Field");
		} else {
			$.ajax({
				async: true,
				url: "/search",
				type: "POST",
				data: 
				{
					"food": food_input, 
					"restaurant":  restaurant_input 
							// "location": $("input[name='location']".val())
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



	// get current location
	// var visible = true;
	// var geocoder;

	// navigator.geolocation.getCurrentPosition(function (pos) {
	//     var geocoder = new google.maps.Geocoder();
	//     var lat = pos.coords.latitude;
	//     var lng = pos.coords.longitude;
	//     var latlng = new google.maps.LatLng(lat, lng);

	//     //reverse geocode the coordinates, returning location information.
	//     geocoder.geocode({ 'latLng': latlng }, function (results, status) {
	//         var result = results[0];
	//         var city = '';

	//         for (var i = 0, len = result.address_components.length; i < len; i++) {
	//             var ac = result.address_components[i];

	//             if (ac.types.indexOf('administrative_area_level_3') >= 0) {
	//                 city = ac.short_name;
	//             }
	//         }

	//         $('location').val(city);

	//     });
	// });


	// sentiment analysis
	function run_sentiment_analysis(text) {
		$.post("/sentiment", {'text': text}, function(data, status) {
			if (data.success) {
				score = data['result']['score'];
			}
		});
	}
})
