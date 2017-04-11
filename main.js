/* main.js
* 
* TODO:
* - Cache whole page text when possible/read
* - Cache reading progress?
* - Remove html parsing from sbd node module
* - Break this up into more descrete modules
* - Combine Words.js and WordNav.js
* 
* DONE:
* - Cache options and prevent them from being reset on
* 	close of extension
* - Trigger pause on clicking of central element, not
* 	just text
* - Add function "cleanNode" to get rid of unwanted elements
* 
* 
* WARNING:
* WARNING:
* Storage is all user settings. Too cumbersome otherwise for now.
*/
console.log("INYECTED");
(function(){

	// ============== SETUP ============== \\
	var $ 			= require('jquery');

	var Parser 		= require('./lib/parse/Parser.js'),
		ParserSetup = require('./lib/ParserSetup.js');

	var Settings 	= require('./lib/settings/Settings.js'),
		Storage 	= require('./lib/ReaderlyStorage.js'),
		WordNav 	= require('./lib/parse/WordNav.js'),
		WordSplitter= require('./lib/parse/WordSplitter.js'),
		Delayer 	= require('@knod/string-time'),
		Timer 		= require('./lib/playback/ReaderlyTimer.js'),
		Display 	= require('./lib/ReaderlyDisplay.js'),
		PlaybackUI 	= require('./lib/playback/PlaybackUI.js'),
		SettingsUI 	= require('./lib/settings/ReaderlySettings.js'),
		SpeedSetsUI = require('./lib/settings/SpeedSettings.js'),
		WordSetsUI 	= require('./lib/settings/WordSettings.js');

	var parser, fragmentor, wordNav, storage, delayer, timer, coreDisplay, playback, settingsUI, speed;


	var addEvents = function () {
		$(timer).on( 'starting', function showLoading() { playback.wait(); })
	};  // End addEvents()


	var afterLoadSettings = function ( oldSettings ) {
		var setts 	= new Settings( storage, oldSettings );
		delayer 	= new Delayer( setts._settings );
		timer 		= new Timer( delayer );
		coreDisplay = new Display( timer, undefined, setts );

		textElem 	= coreDisplay.nodes.textElements;
		fragmentor 	= new WordSplitter( textElem, setts );

		playback 	= new PlaybackUI( timer, coreDisplay );
		settingsUI 	= new SettingsUI( coreDisplay );
		speedSetsUI = new SpeedSetsUI( setts, settingsUI );
		wordSetsUI 	= new WordSetsUI( setts, settingsUI );

		addEvents();
	};  // End afterLoadSettings()


	var getParser = function () {
		var pSup = new ParserSetup();
		// FOR TESTING
		pSup.debug = false;

		// Functions to pass to parser
		var cleanNode 		= pSup.cleanNode,
			detectLanguage 	= pSup.detectLanguage,
			findArticle 	= pSup.findArticle,
			cleanText 		= pSup.cleanText,
			splitSentences 	= pSup.splitSentences;

		return new Parser( cleanNode, detectLanguage, findArticle, cleanText, splitSentences );
	};  // End getParser()


	var init = function () {

		parser  = getParser();
		parser.debug = false;

		wordNav = new WordNav();
		storage = new Storage();

		// !!!FOR DEBUGGING ONLY!!!
		if ( false ) {
			storage.clear()
			console.log('cleared storage');
		}

		storage.loadAll( afterLoadSettings );
	};  // End init()


	// ============== START IT UP ============== \\
	init();



	// ============== RUNTIME ============== \\
	var read = function ( node ) {

		var sentenceWords = parser.parse( node );  // returns [[Str]]

        if (parser.debug) {  // Help non-coder devs identify some bugs
    	    console.log('~~~~~parse debug~~~~~ If any of those tests failed, the problem isn\'t with Readerly, it\'s with one of the other libraries. That problem will have to be fixed later.');
        }
		
		wordNav.process( sentenceWords, fragmentor );
		timer.start( wordNav );
		return true;
	};


	var openReaderly = function () {
		coreDisplay.open();
		playback.wait();  // Do we need this?
	};


	var createReadableContainer = function(selection) {
        var $readable = $('<div></div>');
        $readable.append(selection);
        return $readable;
    };
    var getTextSelection = function() {
		return document.getSelection().getRangeAt(0).cloneContents();
    };
    var isEmptyContainer = function(container) {
		return !container[0].innerHTML;
    };
	var readSelectedText = function () {
		var $container = createReadableContainer(getTextSelection());
        openReaderly();
        return isEmptyContainer($container) ? false : read($container);
	};


	var readArticle = function () {

	    console.log('Started reading');

	    // Checking if the page is fully loaded.
	    if (document.readyState === 'complete') {
	        // If the page is fully loaded we proceed to open readerly
            openReaderly();
            var $clone = $('html').clone();
            read( $clone[0] );

        } else {
	        // If the page is not ready we add the reading function to the on load event.
	        // The window onload event is copied to about overwriting any functionality from the site.
	        var oldWindowLoadEvent = window.onload;

	        window.onload = function () {
	            // We trigger the old window load event if it exist.
                if (oldWindowLoadEvent) {
                    oldWindowLoadEvent()
                }
                // We call the read acticle when the page is loaded. readyState should be equal to
                // 'complete' now
                readArticle();
            }

        }
	};



	// ==============================
	// EXTENSION EVENT LISTENER
	// ==============================
	var browser = chrome || browser;

	browser.extension.onMessage.addListener(function (request, sender, sendResponse) {

		var func = request.functiontoInvoke;
		if ( func === "readSelectedText" ) { readSelectedText(); }
		else if ( func === "readFullPage" ) { readArticle(); }

	});  // End event listener

})();


