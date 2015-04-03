$(function(){
	// sentiment analysis
	function run_sentiment_analysis(text) {
		$.post("/sentiment", {'text': text}, function(data, status) {
			if (data.success) {
				score = data['result']['score'];
			}
		});
	}
})