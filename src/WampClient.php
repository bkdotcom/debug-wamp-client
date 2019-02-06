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

	protected $cfg = array(
		'jquery' => '//ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js',
		'bootstrapJs' => '//maxcdn.bootstrapcdn.com/bootstrap/3.4.0/js/bootstrap.min.js',
		'bootstrapCss' => '//maxcdn.bootstrapcdn.com/bootstrap/3.4.0/css/bootstrap.min.css',
	);

	/**
	 * Constructor
	 *
	 * @param Debug $debug debug instance
	 * @param array $cfg   config opts
	 */
	public function __construct(Debug $debug, $cfg = array())
	{
		$this->debug = $debug;
		$this->cfg = \array_merge($this->cfg, $cfg);
		$this->handleRequest();
	}

	/**
	 * Output html or script
	 *
	 * @return void
	 */
	public function handleRequest()
	{
		$action = isset($_GET['action'])
			? $_GET['action']
			: 'index';
		$method = 'action'.\ucfirst($action);
		if (\method_exists($this, $method)) {
			$this->{$method}();
		} else {
			\header("HTTP/1.0 404 Not Found");
			echo '<h1>404</h1>';
			echo '<p><code>action='.\htmlspecialchars($action).'</code> isn\'t a thing.</p>';
		}
	}

	/**
	 * Output HTML
	 *
	 * @return void
	 */
	public function actionIndex()
	{
		\header('Content-Type: text/html');
		echo \preg_replace_callback('/{{\s*([^}]+)\s*}}/', function ($matches) {
			$token = $matches[1];
			return isset($this->cfg[$token])
				? $this->cfg[$token]
				: '';
		}, \file_get_contents(__DIR__.'/views/index.html'));
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
