PHPDebugConsole WAMP Plugin Client
===============

Debug your PHP applications (both web and console) in realtime.

Debug/log information is sent completely "out-of-bounds" via websockets.  Since log data isn't sent in the message body or headers of your application, we can debug any request method (including ajax and console application) without affecting the output.

All [PHPDebugConsole](https://github.com/bkdotcom/PHPDebugConsole) methods are supported.

using a combination of [PHP&#xfeff;Debug&#xfeff;Console](https://github.com/bkdotcom/PHPDebugConsole) and [Wamp&#xfeff;Publisher](https://github.com/bkdotcom/WampPublisher)

### Overview
There are 3 parts to this logging solution.

 * This client.  Think of this as an undocked (separate-windowed) browser console.  Instead of viewing javascript info, it's PHP stuff<sup>†</sup>.
 * The PHP application thats "publishing" log messages (via [PHPDebugConsole](https://github.com/bkdotcom/PHPDebugConsole))
 * A WAMP (websockets protocol) router that serves as a middle man between this client and the PHP application

All 3 components *can* be be running on the same server/environment, or be on 3 separate servers, it doesn't matter.  I imagine in most cases, this client and the router will be installed on a local dev environment... aka your laptop.

> † PHPDebugConsole also supports output via plain 'ol `<script>` output, ChromeLogger, & FirePHP..  This WAMP solution isn't limited by what the browser's console can do and offers all of the same formatting and features of PHPDebugConsole's HTML output without the disadvantages of being included in the output of your application (or not supported with ajax & CLI applications.


### Installation

Download Composer (if not already installed) [more info](https://getcomposer.org/doc/00-intro.md#downloading-the-composer-executable)  
`$ curl -sS https://getcomposer.org/installer | php`

**create a project directory in your webroot**

    $ mkdir debugWampClient
    $ cd debugWampClient

**Install this client**  
`$ php composer.phar require bdk/debug-wamp-client`

**Install a WAMP router** (if you don't already have one)  
If you don't already have a WAMP router up and running, you might as well install a PHP-based one here in the same folder *(but again, it could be installed anywhere)*
One client+router install can support many PHPDebugConsole projects  
`$ php composer.phar require voryx/thruway`

**Start the WAMP router.**  
`$ php vendor/voryx/thruway/Examples/SimpleWsRouter.php`  
*(note that the router doesn't play well with x-debug.  You will likely need to disable x-debug for this process)*

**Create an `index.php` for the client**

```php
<?php

require __DIR__.'/vendor/autoload.php';

// we pass a debug instance so that the client can use the javascript & css it provides
$debug = \bdk\Debug::getInstance();
new \bdk\Debug\WampClient($debug);
```

**Navigate to the client in your browser**
`http://localhost/debugWampClient`

The client should have connected to the router and is ready to receive log messages

**Add PHPDebugConsole to the project you wish to debug**  
`$ php composer.phar require bdk/debug`

**Install a outputWamp plugin dependency**  
`$ php composer.phar require bdk/wamp-publisher`

Add the OutputWamp plugin to your application
```php
require __DIR__.'/vendor/autoload.php'

$debug = new \bdk\Debug(array(
    'collect' => true,
));
$wampPublisher = new \bdk\WampPublisher(array(
    'realm'=>'debug'
));
$outputWamp = new \bdk\Debug\OutputWamp($debug, $wampPublisher);
$debug->addPlugin($outputWamp);   // or $debug->setCfg('outputAs', $outputWamp);  to prevent the default in-page html output
```
