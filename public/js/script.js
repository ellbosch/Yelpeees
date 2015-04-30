$(function() {
	var jqXHR;
	var GLOBAL = {
		location: ""
	}

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
					var coords = data.lat + "," + data.lng;
					cb(data.zipcode, coords);
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

	function search_businesses() {
		$.ajax({
			async: true,
			url: "/searchBusinesses",
			type: "POST",
			data: {
					"restaurant":  "McDonald's",
					"location": "39.952117099999995, -75.20109599999999"
				},
				success: function(data) {
					console.log(data);
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.log("error");
				}
		});
	}

	function search_reviews(business_id, food_input) {
		$.ajax({
			async: true,
			url: "/search",
			type: "POST",
			dataType: "json",
			data: {
				"businessId":  business_id,
				"food": food_input
			}, success: function(data) {
				if (data.success) {
					var parsed_data = JSON.parse(data.data)
					console.log(parsed_data);
					var reviews = parsed_data.reviews;
					console.log("REVIEWS (from data): " + reviews);
					var sentiment = parsed_data["sentiment"]["avg"];
					display_review_data(food_input, reviews, sentiment);
				} else {
					// TODO
				}
			}, error: function (xhr, ajaxOptions, thrownError) {
					console.log("error");
			}
		});
	}

	// displays food review data
	function display_review_data(food_input, reviews, sentiment_rating) {
		console.log(typeof reviews);



		$("#loading-screen").hide();		// hide loading screen
		$("#food-rating-div").show();			// show food-item-div if it is not already showing
		$("#reviews-div").show();

		var food_input_cap = food_input.charAt(0).toUpperCase() + food_input.substring(1);

		// set text to header
		$("#food-item-header").html(food_input.toUpperCase());

		// show rating
		$("#progress-div .progress-bar-success").width(sentiment_rating + "%");
		$("#progress-div .progress-bar-danger").width((100-sentiment_rating) + "%");
		$("#sentiment-rating").html(sentiment_rating);	// show rating percentage
		$("#num-reviews").html(reviews.length);	// show number of reviews

		// show new yelp reviews
		var review_html = "";
		for (var i = 0; i < reviews.length; i++) {
			var r = reviews[i];
			review_html = review_html + "<div class='review'><p>" + r + "</p></div>"
		}
		$("#reviews-text-div").html(review_html);
	}

	// convert address into coordinates
	function getHistory() {
		console.log("history");
		$.ajax({
			async: true,
			url: "/getHistory",
			type: "POST",
			success: function(data) {
				console.log("history results");
				console.log(data);
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.log(xhr.error);
			}
		});
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

				if (!input_str || input_str == "Getting current location...") {
					$(all_divs[i]).addClass("has-error");
					$("#loading-screen").hide();
					is_valid = false;
				}
			}
		}
		return is_valid;
	}

	// post request for business data
	function request_business_data(restaurant, location) {
		if (restaurant != "") {
			$("#loading-screen").show();

			jqXHR = $.ajax({
				async: true,
				url: "/searchBusinesses",
				type: "POST",
				dataType: "json",
				data: {
						"restaurant": restaurant,
						"location": location
					},
					success: function(data) {
						display_business_data(data.businesses);
					},
					error: function (xhr, ajaxOptions, thrownError) {
						// console.log("error");
					}
			});
		}
	}

	// displays business data
	function display_business_data(data) {
		$("#loading-screen").hide();
		$("#restaurant-results-div").show();
		$("#picked-restaurant-div").hide();
		$("#food-rating-div").hide();
		$("#reviews-div").hide();
		$("#restaurant-results-div").html("<h4>Select Your Restaurant:</h4>");

		for (var i = 0; i < data.length; i++) {
			var id = data[i][0];
			var name = data[i][1];
			var address_arr = data[i][2].split(", ");
			var address_1 = address_arr[0];
			var address_2 = address_arr[1] + ", " + address_arr[2];
			var str =	"<div class='card restaurant-result' data-id=" + id + ">"
							+ "<div class='restaurant-name'><h3>"
							+ name.toUpperCase() + "</div><div class='restaurant-address'>"
							+ "<p>" + address_1 + "</p><p>" + address_2 + "</p>"
							+ "</div></div>"
			$("#restaurant-results-div").append(str);
		}
	}

	// ensures valid location
	function confirm_location(cb) {
		// check if input is valid
		var is_valid = check_for_valid_inputs($("#edit-location-div form"));

		if (is_valid) {
			var address = $("#search-input-location").val();
			geocode(address, function(zip, coords) {
				$("#current-zip").html(zip);
				GLOBAL.location = coords;

				if (cb != null) {
					cb();
				}
			});
			$("#edit-location-div").hide();
		} else {
			$("#edit-location-div").show();
		}
	}

	// cancels query
	function cancel_query() {
		$("#loading-screen").hide();
		$("#wrapper-result").hide();
		jqXHR.abort();
	}



	
	// event handler for getting businesses
	$("#search-restaurant-btn").on('click', function(e) {
		e.preventDefault();

		var input = $("#restaurant-search-input").val().trim();	// check if input is valid
		$("#loading-screen").show();
		confirm_location(function() {							// approve location
			// below only happens if location gets confirmed
			var location = GLOBAL.location;
			request_business_data(input, location);
		});
	});

	// calls search-restaurant on enter press
	$("#restaurant-search-input").keypress(function(e) {
		if(e.which == 13){
            $('#search-restaurant-btn').click();
        }
	});

	// show search inputs when search button is clicked
	$("#current-location-div a").on('click', function() {
		$("#edit-location-div").toggle();
		$(".history").css({"padding-top": "100px"});
	});

	// event handler for getting current location
	$("#current-location-btn").on('click', get_current_location);

	// event handler for saving custom location
	$("#location-input-btn").on('click', function(e) {
		$(".history").css({"padding-top": "5px"});
		e.preventDefault();
		confirm_location();
	});
	
	// calls location search on enter press
	$("#search-input-location").keypress(function(e) {
		if(e.which == 13){
            $('#location-input-btn').click();
        }
	});

	// event handler for selecting a restaurant
	$("#wrapper-result #restaurant-results-div").on('click', ".restaurant-result", function() {
		var business_id = $(this).attr("data-id");
		var business_name = $(this).find(".restaurant-name").text();
		var addr_1 = $(this).find(".restaurant-address p:first-child").text();
		var addr_2 = $(this).find(".restaurant-address p:nth-child(2)").text();

		$("#restaurant-results-div").hide();
		$("#picked-restaurant-div").show();

		$("#restaurant-info-div").attr("data-id", business_id);
		$("#restaurant-info-div h3").html(business_name);
		$("#restaurant-info-div #addr_line1").html(addr_1);
		$("#restaurant-info-div #addr_line2").html(addr_2);
	});

	// event handler for searching for food
	$("#search-food-input").keypress(function(e) {
		if(e.which == 13) {
			$("#loading-screen").show();
			var business_id = $("#restaurant-info-div").attr("data-id");
			var food_input = $(this).val();
			search_reviews(business_id, food_input);
		}
	})

	// event handler for canceling loads
	$("#cancel-load").on('click', function() {
		cancel_query();	
	});
});
