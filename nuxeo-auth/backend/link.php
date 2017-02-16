<?php
require __DIR__ . '/vendor/autoload.php';
use Nuxeo\Client\Api\NuxeoClient;
use Nuxeo\Client\Api\Objects\Document;
use Nuxeo\Client\Internals\Spi\NuxeoClientException;

$entityBody = json_decode(file_get_contents('php://input'));

$url = $entityBody->url;
$user = $entityBody->user;
$password = $entityBody->password;
$client = new NuxeoClient($url, $user, $password);

try {   
        echo('{"token":"'.base64_encode($url."|".$user."|".$client->requestAuthenticationToken('Alexa Nuxeo App', 'Amazon Echo', 'Auth relay', 'Read', false)).'"}');
} catch (NuxeoClientException $ex) {
        http_response_code($ex->getMessage());
}
?>
