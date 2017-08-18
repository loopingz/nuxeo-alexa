<?php
require __DIR__ . '/vendor/autoload.php';
use Nuxeo\Client\Api\NuxeoClient;
use Nuxeo\Client\Api\Objects\Document;
use Nuxeo\Client\Internals\Spi\NuxeoClientException;
use Nuxeo\Client\Api\Auth\TokenAuthentication;
require 'secret.php';

function decrypt($data) {
	global $SECRET;
	$pass = openssl_digest($SECRET,"sha256", true);
	$algo = "aes-256-ctr";
	$options = OPENSSL_RAW_DATA;
	$plain = base64_decode($data);
	return openssl_decrypt(substr($plain,16), $algo, $pass, $options, substr($plain,0,16));
}

function defaultImage() {
	$name = 'nuxeo_doc.png';
	$fp = fopen('nuxeo_doc.png', 'rb');

	header("Content-Type: image/png");
	header("Content-Length: " . filesize($name));

	fpassthru($fp);
	die();
}

$uid = $_REQUEST["uid"];
$tokenRaw = $_REQUEST["token"];
$token = explode("|", decrypt($tokenRaw));
$url = $token[0];
$user = $token[1];
$token = $token[2];

try {
   $client = new NuxeoClient($url);
   $client = $client->setAuthenticationMethod(new TokenAuthentication($token));

   $doc = $client->automation('Document.Fetch')->param('value', $uid)->execute(Document::className);
   $thurl = $url."/api/v1/id/".$uid."/@rendition/thumbnail";
   $res = $client->get($thurl);
   header("Content-Type: ".$res->getContentType());
   header("Content-Length: " . $res->getContentLength());
   print($res->getBody());
} catch (Exception $e) {
  defaultImage();
}
?>
