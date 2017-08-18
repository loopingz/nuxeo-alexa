<?php
require __DIR__ . '/vendor/autoload.php';
use Nuxeo\Client\Api\NuxeoClient;
use Nuxeo\Client\Api\Objects\Document;
use Nuxeo\Client\Internals\Spi\NuxeoClientException;
require 'secret.php';

function encrypt($data) {
	global $SECRET;
	$pass = openssl_digest($SECRET,"sha256", true);
	$iv = openssl_random_pseudo_bytes(16);
	$algo = "aes-256-ctr";
	$options = OPENSSL_RAW_DATA;
	$encData = openssl_encrypt($data, $algo, $pass, $options, $iv);
	return base64_encode($iv.$encData);
}

$entityBody = json_decode(file_get_contents('php://input'));

$url = $entityBody->url;
$user = $entityBody->user;
$password = $entityBody->password;
$client = new NuxeoClient($url, $user, $password);

try {   
	// We should do the URL encode on the browser side but was just more convenient here
    echo('{"token":"'.urlencode(encrypt($url."|".$user."|".$client->requestAuthenticationToken('Alexa Nuxeo App', 'Amazon Echo', 'Auth relay', 'Read', false))).'"}');
} catch (NuxeoClientException $ex) {
    http_response_code($ex->getMessage());
}
?>
