$(function(){
	$("#Search").click(function() {
		$("#error").html("");
		if ($("input[name='food']").val().trim() == "") {
			$("#error").html("Empty Food Field");
		}
		else {
			$.ajax({
				async: true,
				url: "/search",
				type: "POST",
				data: 
				{
					"food": $("input[name='food']").val(), 
					"restaurant":  $("input[name='restaurant']").val() 
							// "location": $("input[name='location']".val())
						}// ,
					// success: function(data) {
					// 	// console.log("data " + data.success);
					// 	// data = JSON.parse(data);
					// 	// if (data.success) {
					// 	// 	console.log("got data from backend");
					// 	// 	console.log(data.data);
					// 	// }

					// },
					// error: function (xhr, ajaxOptions, thrownError) {
					// 	console.log("error");
					// $("#error").html(xhr.responseText);
					// }
				});
		}
	});
	

	// get current location
	var visible = true;
	var geocoder;

	navigator.geolocation.getCurrentPosition(function (pos) {
	    var geocoder = new google.maps.Geocoder();
	    var lat = pos.coords.latitude;
	    var lng = pos.coords.longitude;
	    var latlng = new google.maps.LatLng(lat, lng);

	    //reverse geocode the coordinates, returning location information.
	    geocoder.geocode({ 'latLng': latlng }, function (results, status) {
	        var result = results[0];
	        var city = '';

	        for (var i = 0, len = result.address_components.length; i < len; i++) {
	            var ac = result.address_components[i];

	            if (ac.types.indexOf('administrative_area_level_3') >= 0) {
	                city = ac.short_name;
	            }
	        }

	        $('location').val(city);

	    });
	});


	// sentiment analysis
	function run_sentiment_analysis(text) {
		$.post("/sentiment", {'text': text}, function(data, status) {
			if (data.success) {
				score = data['result']['score'];
			}
		});
	}
})
