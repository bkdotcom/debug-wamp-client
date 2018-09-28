<?php
/**
 * This is a WAMP (http://wamp-proto.org/) based PHPDebugConsole client
 *
 * Server-side PHP code publishes debug messages...
 * This client subscribes to those messages and displays them here
 *
 * This is useful for debugging
 *     console applications
 *     AJAX calls
 *     any web request where outputting debug information will affect the layout of the page
 */

namespace bdk\Debug;

use bdk\Debug;

/**
 * PHPDebugConsole WAMP plugin client
 */
class WampClient
{

	/**
	 * Constructor
	 *
	 * @param Debug $debug debug instance
	 */
	public function __construct(Debug $debug)
	{
		$this->debug = $debug;
		$this->handleRequest();
	}

	/**
	 * Output html or script
	 *
	 * @return void
	 */
	public function handleRequest()
	{
		$action = isset($_GET['action']) && \method_exists($this, 'action'.\ucfirst($_GET['action']))
			? $_GET['action']
			: 'index';
		$this->{'action'.\ucfirst($action)}();
	}

	/**
	 * Output HTML
	 *
	 * @return void
	 */
	public function actionIndex()
	{
		\header('Content-Type: text/html');
		\readfile(__DIR__.'/views/index.html');
	}

	/**
	 * Output CSS
	 *
	 * @return void
	 */
	public function actionCss()
	{
		\header('Content-Type: text/css');
		echo $this->debug->output->getCss();
		\readfile(__DIR__.'/css/WampClient.css');
	}

	/**
	 * Output Img
	 *
	 * @return void
	 */
	public function actionImg()
	{
		$src = isset($_GET['src']) ? $_GET['src'] : null;
		$srcSanitized = __DIR__.'/img/'.\str_replace('..', '', $src);
		if ($src && \file_exists($srcSanitized)) {
			\header('Content-Type: image/png');
			\header('Content-Disposition: inline; filename="'.\rawurlencode(\basename($srcSanitized)).'"');
			\header('Content-Length: '.\filesize($srcSanitized));
			\readfile($srcSanitized);
		} else {
			\header("HTTP/1.0 404 Not Found");
		}
	}

	/**
	 * Output Javascript
	 *
	 * @return void
	 */
	public function actionScript()
	{
		$scripts = array(
			'autobahn.min.js',
			'Queue.js',
		    'main.js',
			'socketWorker.js',
		    'base64.arraybuffer.js',
		    'StrDump.js',
		    'LogDumper.js',
		    'DumpObject.js',
		    'MethodTable.js',
		);
		\header('Content-Type: application/javascript');
		\readfile($this->debug->getCfg('filepathScript'));
		foreach ($scripts as $path) {
			$path = __DIR__.'/js/'.$path;
			\readfile($path);
		}
	}
}
