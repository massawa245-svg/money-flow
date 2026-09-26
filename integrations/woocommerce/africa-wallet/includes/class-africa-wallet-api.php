<?php
/**
 * Minimal client for the Africa Wallet API (/api/v1).
 */

defined( 'ABSPATH' ) || exit;

class Africa_Wallet_Api {

	/** @var string */
	private $base_url;

	/** @var string */
	private $secret_key;

	public function __construct( $base_url, $secret_key ) {
		$this->base_url   = untrailingslashit( $base_url );
		$this->secret_key = $secret_key;
	}

	/**
	 * Create a checkout session. Same idempotency key => same session (protects against double clicks).
	 *
	 * @throws Exception On network or API errors.
	 */
	public function create_checkout( array $body, $idempotency_key ) {
		return $this->request( 'POST', '/api/v1/checkout', $body, array( 'Idempotency-Key' => $idempotency_key ) );
	}

	/**
	 * @throws Exception On network or API errors.
	 */
	public function get_checkout( $checkout_id ) {
		return $this->request( 'GET', '/api/v1/checkout/' . rawurlencode( $checkout_id ) );
	}

	private function request( $method, $path, $body = null, $headers = array() ) {
		$args = array(
			'method'  => $method,
			'timeout' => 20,
			'headers' => array_merge(
				array(
					'Authorization' => 'Bearer ' . $this->secret_key,
					'Content-Type'  => 'application/json',
					'User-Agent'    => 'AfricaWallet-WooCommerce/' . AFRICA_WALLET_VERSION,
				),
				$headers
			),
		);
		if ( null !== $body ) {
			$args['body'] = wp_json_encode( $body );
		}

		$response = wp_remote_request( $this->base_url . $path, $args );
		if ( is_wp_error( $response ) ) {
			throw new Exception( $response->get_error_message() );
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		$data = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( $code < 200 || $code >= 300 || ! is_array( $data ) ) {
			$message = isset( $data['error']['message'] ) ? $data['error']['message'] : 'HTTP ' . $code;
			throw new Exception( $message );
		}
		return $data;
	}

	/**
	 * Verify a webhook signature: header "t=<unix>,v1=<hex>", HMAC-SHA256 over "<t>.<body>", at most 5 minutes old.
	 */
	public static function verify_signature( $raw_body, $signature_header, $secret ) {
		$parts = array();
		foreach ( explode( ',', (string) $signature_header ) as $part ) {
			$pair              = array_pad( explode( '=', $part, 2 ), 2, '' );
			$parts[ $pair[0] ] = $pair[1];
		}
		$timestamp = isset( $parts['t'] ) ? $parts['t'] : '';
		if ( ! ctype_digit( $timestamp ) || abs( time() - (int) $timestamp ) > 300 ) {
			return false;
		}
		$expected = hash_hmac( 'sha256', $timestamp . '.' . $raw_body, $secret );
		return hash_equals( $expected, isset( $parts['v1'] ) ? $parts['v1'] : '' );
	}
}
