$(function(){
	var jqXHR;

	// find current location
	get_current_location();

	// convert address into coordinates
	function geocode(address, cb) {
		$.ajax({
			async: true,
			url: "/geocode",
			type: "POST",
			dataType: "json",
			data: {
					"address": address
				},
				success: function(data) {
					cb(data.lat + "," + data.lng, data.zipcode);
				},
				error: function (xhr, ajaxOptions, thrownError) {
					// console.log("error");
				}
		});
	}

	// convert coordinates to address info
	function reverse_geocode(coords, show_current_location) {
		$.ajax({
			async: true,
			url: "/reverse_geocode",
			type: "POST",
			dataType: "json",
			data: {
					"coords": coords
				},
				success: function(data) {
					parsed_data = data;
					show_current_location(data);
				},
				error: function (xhr, ajaxOptions, thrownError) {
					// console.log("error");
				}
		});
	}

	function get_current_location() {
		$("#search-input-location").val("Getting current location...");
		$("#search-input-location").prop("disabled", true);

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function (position) {
			    var lat = position.coords.latitude;
			    var lng = position.coords.longitude;

			    // get address info from coordinates
			    reverse_geocode(lat + "," + lng, show_current_location);
			});
		}
	}

	function show_current_location(data) {
		var zip = data["zipcode"];
		var address = data["address"];

	    $("#search-input-location").val(address);			// put full address info in location input
	    $("#current-zip").html(zip);						// put zip in nav
		$("#search-input-location").prop("disabled", false);// re-enable location input
	}

	// checks for empty inputs
	function check_for_valid_inputs($form) {
		var is_valid = true;				// return true if all inputs have strings
		var all_divs = $form.find(".form-group");

		// remove input errors
		$($form).find(".form-group").removeClass("has-error");

		// add errors to any inputs that are empty
		for (var i = 0; i < all_divs.length; i++) {
			var input = $(all_divs[i]).find("input")[0];

			if (input != undefined) {
				var input_str = $(input).val().trim();

				if (!input_str) {
					$(all_divs[i]).addClass("has-error");
					is_valid = false;
				}
			}
		}
		return is_valid;
	}

	// displays food review data
	function display_food_data(food_input, data, sentiment_rating) {
		$("#loading-screen").hide();		// hide loading screen
		$("#wrapper-result").show();			// show food-item-div if it is not already showing

		var restaurant_name = data[0]["NAME"];
		var food_input_cap = food_input.charAt(0).toUpperCase() + food_input.substring(1);
		var rating = Math.round(sentiment_rating/12 * 100);

		// set text to search button
		var btn_str = "<strong>" + food_input_cap + "</strong> at <strong>" + restaurant_name + "</strong>"
		$("#search-btn-query").html(btn_str);

		// set text to header
		$("#food-item-header").html(food_input.toUpperCase());

		// show rating
		$("#progress-div .progress-bar-success").width(rating + "%");
		$("#progress-div .progress-bar-danger").width((100-rating) + "%");
		$("#sentiment-rating").html(rating);	// show rating percentage
		$("#num-reviews").html(data.length);	// show number of reviews

		// show new yelp reviews
		var review_html = "";
		for (var i = 0; i < data.length; i++) {
			var review = data[i];
			review_html = review_html + "<div class='review'><p>" + review["TEXT"] + "</p></div>"
		}
		$("#reviews-div").html(review_html);
	}

	// cancels query
	function cancel_query() {
		$("#loading-screen").hide();
		$("#wrapper-result").hide();
		jqXHR.abort();
	}
	

	// show search inputs when search button is clicked
	$("#current-location-div a").on('click', function() {
		$("#edit-location-div").toggle();
	});

	// event handler for getting current location
	$("#current-location-btn").on('click', get_current_location);

	// event handler for saving custom location
	$("#location-input-btn").on('click', function(e) {
		e.preventDefault();

		// check if input is valid
		var is_valid = check_for_valid_inputs($("#edit-location-div form"));

		if (is_valid) {
			var address = $("#search-input-location").val();
			geocode(address, function(coords, zip) {
				// DO SOMETHING WITH COORDS

				$("#current-zip").html(zip);
			});
			$("#edit-location-div").hide();
		}
	})

	// event handler for when a search is made
	// $("#search-input-btn").on('click', function(event) {
	// 	event.preventDefault();
	// 	var is_valid = check_for_valid_inputs($("#edit-restaurant-div form"));
	// 	$("#error-div").hide();

	// 	// below only executes if all inputs have entries
	// 	if (is_valid) {
	// 		$("#loading-screen").show();	// show loading screen
	// 		$("#edit-restaurant-div").hide();	// hide search field divs

	// 		var food_input = $("#search-input-food").val().trim();
	// 		var restaurant_input = $("#search-input-restaurant").val().trim();
	// 		var location_input = $("#search-input-location").val().trim();

	// 		jqXHR = $.ajax({
	// 			async: true,
	// 			url: "/search",
	// 			type: "POST",
	// 			data: {
	// 					"food": food_input, 
	// 					"restaurant":  restaurant_input,
	// 					"location": location_input
	// 				},
	// 				success: function(data) {
	// 					$("#reviews-div").html("");		// hide old review data
	// 					var data_parsed = JSON.parse(data);
	// 					var data_result = data_parsed["data"];
	// 					var sentiment_result = data_parsed["sentiment"];
	// 					var reviews_result = JSON.parse(data_result);

	// 					if (reviews_result.length == 0) {
	// 						cancel_query();
	// 						// show error message when no reviews are returned from query
	// 						$("#error-div").show();
	// 					} else {
	// 						// display food data
	// 						display_food_data(food_input, reviews_result, parseFloat(sentiment_result["avg"]));
	// 					}
	// 				},
	// 				error: function (xhr, ajaxOptions, thrownError) {
	// 					// console.log("error");
	// 				}
	// 		});
	// 	}
	// });

	// event handler for canceling loads
	$("#cancel-load").on('click', function() {
		cancel_query();	
	});
})
