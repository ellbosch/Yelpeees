$(function(){
	$("#Search").click(function() {
		$("#error").html("");
		var lat;
		var lng;
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function (position) {
			    lat = position.coords.latitude;
			    lng = position.coords.longitude;

			    if ($("input[name='food']").val().trim() == "") {
					$("#error").html("Empty Food Field");
				}
				else {
					$.ajax({
						async: true,
						url: "/search",
						type: "POST",
						data: 
							( $("input[name='location']").val().trim() == "" ? 
								{
									"food": $("input[name='food']").val(), 
									"restaurant":  $("input[name='restaurant']").val(),
									"location": lat + "," + lng
								} :
								{
									"food": $("input[name='food']").val(), 
									"restaurant":  $("input[name='restaurant']").val(),
									"location": $("input[name='location']").val()
								}
							)
					});
				}
			});
		}
		else {
			if ($("input[name='food']").val().trim() == "") {
				$("#error").html("Empty Food Field");
			}
			else if ($("input[name='location']").val().trim() == "") {
				$("#error").html("Empty Location Field");
			}
			else {
				$.ajax({
					async: true,
					url: "/search",
					type: "POST",
					data: 
						{
							"food": $("input[name='food']").val(), 
							"restaurant":  $("input[name='restaurant']").val(),
							"location": $("input[name='location'])").val()
						}
				});
			}
		}
		
	});
	

	// get current location
	var visible = true;

	

	// sentiment analysis
	function run_sentiment_analysis(text) {
		$.post("/sentiment", {'text': text}, function(data, status) {
			if (data.success) {
				score = data['result']['score'];
			}
		});
	}
})
