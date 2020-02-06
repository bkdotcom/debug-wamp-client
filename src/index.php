<?php

require __DIR__.'/vendor/autoload.php';

// we pass a debug instance so that the client can use the javascript & css it provides
$debug = \bdk\Debug::getInstance();
$wampClient = new \bdk\Debug\WampClient($debug);
$wampClient->handleRequest();
