PHPDebugConsole WAMP Plugin/Client
===============

Debug your PHP applications (both web and console) in realtime.

Debug/log information is sent completely "out-of-bounds" via websockets.  Since log data isn't sent in the message body or headers of your application, we can debug any request method (including ajax and console application) without affecting the application's output.

All [PHPDebugConsole](https://github.com/bkdotcom/PHPDebugConsole) methods are supported.

### Overview
There are 3 parts to this solution.

 * This client.  Think of this as an undocked (separate-windowed) browser console.  Instead of viewing javascript stuff, it's PHP stuff<sup>†</sup>.
 * [A WAMP (websockets protocol) router](http://wamp-proto.org/implementations/#routers) that serves as a middle man between this client and the PHP application
 * The PHP application thats "publishing" log messages (via [PHPDebugConsole](https://github.com/bkdotcom/PHPDebugConsole))

All 3 components *can* be be running on the same server/environment, or be on 3 separate servers, it doesn't matter.  I imagine in most cases, this client and the router will be installed on a local dev environment... aka your laptop.

> † PHPDebugConsole also supports output via plain 'ol `<script>` output, ChromeLogger, & FirePHP..  This WAMP solution isn't limited by what the browser's console can do and offers all of the same formatting and features of PHPDebugConsole's HTML output without the disadvantages of being included in the output of your application (or not supported with ajax & CLI applications.

### Installation


#### Prerequisite : Install Composer

**Download Composer** (if not already installed) [more info](https://getcomposer.org/doc/00-intro.md#downloading-the-composer-executable)  
`$ curl -sS https://getcomposer.org/installer | php`

----
#### 1. Client

**create a project directory in your webroot**

```
$ mkdir debugWampClient
$ cd debugWampClient
```

 **Install this client**

(make sure you're in the project directory)

`$ php composer.phar require bdk/debug-wamp-client`

**Create an `index.php` for the client**

(this index.php should be created in the project directory)

```php
<?php

require __DIR__.'/vendor/autoload.php';

// we pass a debug instance so that the client can use the javascript & css it provides
$debug = \bdk\Debug::getInstance();
new \bdk\Debug\WampClient($debug);
```
----
#### 2. Router

 **Install a WAMP router** (if you don't already have one)  
If you don't already have a WAMP router up and running, you might as well install a PHP-based one here in the same folder *(but again, it could be installed anywhere, or be a node based router)*
One client+router install can support many PHPDebugConsole projects
`$ php composer.phar require voryx/thruway`

 **Start the WAMP router.**  
`$ php vendor/voryx/thruway/Examples/SimpleWsRouter.php`
*(note that the router doesn't play well with x-debug.  If you have x-debug installed, you  will likely need to disable it for this process.  See [this gist](https://gist.github.com/bkdotcom/4b635f7c7c07dd5800dee89cdb99e4f6))*

----
#### 3. Application You're Debugging  

**Add PHPDebugConsole and WAMP dependency to the project you wish to debug**

```
$ php composer.phar require bdk/debug
$ php composer.phar require bdk/wamp-publisher
```

Bootstrap PHPDebugConsole with the WAMP output plugin

```php
require __DIR__.'/vendor/autoload.php'

$debug = new \bdk\Debug(array(
    'collect' => true,
));
$wampPublisher = new \bdk\WampPublisher(array(
    'realm'=>'debug'
));
$outputWamp = new \bdk\Debug\Output\Wamp($debug, $wampPublisher);  // see note below
$debug->addPlugin($outputWamp);   // or $debug->setCfg('outputAs', $outputWamp);  to prevent the default in-page html output
```

\* The wamp-plugin classname changed in PHPDebugConsole v2.1.  
If you're using pre-2.1 use: `new \bdk\Debug\OutputWamp($debug, $wampPublisher);`

----
#### Everything's setup and ready

**Navigate to the client in your browser**  
`http://localhost/debugWampClient`

The client should connect to the router and is ready to receive log messages
