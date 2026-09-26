<?php
/**
 * WooCommerce payment gateway: redirects the customer to the hosted Africa Wallet checkout.
 *
 * An order is only marked as paid after the plugin itself has confirmed the checkout status
 * with the API. Neither the return URL nor the webhook payload is trusted on its own.
 */

defined( 'ABSPATH' ) || exit;

class Africa_Wallet_Gateway extends WC_Payment_Gateway {

	const META_CHECKOUT_ID = '_africa_wallet_checkout_id';

	public function __construct() {
		$this->id                 = 'africa_wallet';
		$this->has_fields         = false;
		$this->method_title       = __( 'Africa Wallet', 'africa-wallet' );
		$this->method_description = __( 'Customers pay with their Africa Wallet balance on a secure hosted checkout page. Test mode – no real money is moved.', 'africa-wallet' );
		$this->supports           = array( 'products' );

		$this->init_form_fields();
		$this->init_settings();

		$this->title       = $this->get_option( 'title' );
		$this->description = $this->get_option( 'description' );

		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
		add_action( 'woocommerce_api_africa_wallet_return', array( $this, 'handle_return' ) );
		add_action( 'woocommerce_api_africa_wallet_webhook', array( $this, 'handle_webhook' ) );
	}

	public function init_form_fields() {
		$webhook_url = WC()->api_request_url( 'africa_wallet_webhook' );

		$this->form_fields = array(
			'enabled'        => array(
				'title'   => __( 'Enable/Disable', 'africa-wallet' ),
				'type'    => 'checkbox',
				'label'   => __( 'Enable Africa Wallet', 'africa-wallet' ),
				'default' => 'no',
			),
			'title'          => array(
				'title'   => __( 'Title', 'africa-wallet' ),
				'type'    => 'text',
				'default' => __( 'Pay with Africa Wallet', 'africa-wallet' ),
			),
			'description'    => array(
				'title'   => __( 'Description', 'africa-wallet' ),
				'type'    => 'textarea',
				'default' => __( 'You will be redirected to Africa Wallet to complete your payment.', 'africa-wallet' ),
			),
			'secret_key'     => array(
				'title'       => __( 'Secret API key', 'africa-wallet' ),
				'type'        => 'password',
				'description' => __( 'Starts with sk_test_. Create it in your Africa Wallet merchant account under "Connect online shop".', 'africa-wallet' ),
			),
			'webhook_secret' => array(
				'title'       => __( 'Webhook signing secret', 'africa-wallet' ),
				'type'        => 'password',
				/* translators: %s: webhook URL */
				'description' => sprintf( __( 'Starts with whsec_. Add this webhook URL in your Africa Wallet account: %s', 'africa-wallet' ), '<code>' . esc_html( $webhook_url ) . '</code>' ),
			),
			'api_base_url'   => array(
				'title'   => __( 'API URL', 'africa-wallet' ),
				'type'    => 'text',
				'default' => AFRICA_WALLET_DEFAULT_API,
			),
		);
	}

	public function is_available() {
		return parent::is_available() && '' !== $this->get_option( 'secret_key' );
	}

	private function api() {
		return new Africa_Wallet_Api( $this->get_option( 'api_base_url', AFRICA_WALLET_DEFAULT_API ), $this->get_option( 'secret_key' ) );
	}

	public function process_payment( $order_id ) {
		$order = wc_get_order( $order_id );

		try {
			$return_url = add_query_arg(
				array(
					'order_id' => $order->get_id(),
					'key'      => $order->get_order_key(),
				),
				WC()->api_request_url( 'africa_wallet_return' )
			);

			// Same key within a 10-minute window: a double click or retry reuses the same checkout,
			// a later attempt (after the 30-minute checkout expired) gets a fresh one.
			$idempotency_key = sprintf( 'wc-%d-%s-%d', $order->get_id(), $order->get_order_key(), intdiv( time(), 600 ) );

			$checkout = $this->api()->create_checkout(
				array(
					'amount'      => (float) wc_format_decimal( $order->get_total(), 2 ),
					'currency'    => $order->get_currency(),
					/* translators: %s: order number */
					'reference'   => sprintf( __( 'Order #%s', 'africa-wallet' ), $order->get_order_number() ),
					'success_url' => $return_url,
					'cancel_url'  => $order->get_cancel_order_url_raw(),
				),
				$idempotency_key
			);

			$order->update_meta_data( self::META_CHECKOUT_ID, $checkout['id'] );
			/* translators: %s: checkout id */
			$order->add_order_note( sprintf( __( 'Africa Wallet checkout created: %s', 'africa-wallet' ), $checkout['id'] ) );
			$order->save();

			return array(
				'result'   => 'success',
				'redirect' => $checkout['url'],
			);
		} catch ( Exception $e ) {
			/* translators: %s: error message */
			wc_add_notice( sprintf( __( 'Africa Wallet payment could not be started: %s', 'africa-wallet' ), $e->getMessage() ), 'error' );
			return array( 'result' => 'failure' );
		}
	}

	/**
	 * Ask the API for the checkout status and complete the order if it was paid.
	 * Also checks amount and currency so a checkout cannot be reused for a different order.
	 */
	private function sync_order( WC_Order $order ) {
		if ( $order->is_paid() ) {
			return;
		}
		$checkout_id = $order->get_meta( self::META_CHECKOUT_ID );
		if ( ! $checkout_id ) {
			return;
		}

		try {
			$checkout = $this->api()->get_checkout( $checkout_id );
		} catch ( Exception $e ) {
			/* translators: %s: error message */
			$order->add_order_note( sprintf( __( 'Africa Wallet status check failed: %s', 'africa-wallet' ), $e->getMessage() ) );
			return;
		}

		if ( 'completed' !== $checkout['status'] ) {
			return;
		}

		$expected = (float) wc_format_decimal( $order->get_total(), 2 );
		if ( abs( (float) $checkout['amount'] - $expected ) > 0.009 || $checkout['currency'] !== $order->get_currency() ) {
			$order->update_status( 'on-hold', __( 'Africa Wallet: paid amount or currency does not match the order. Please check manually.', 'africa-wallet' ) );
			return;
		}

		$order->payment_complete( $checkout_id );
		/* translators: %s: checkout id */
		$order->add_order_note( sprintf( __( 'Africa Wallet payment completed (%s).', 'africa-wallet' ), $checkout_id ) );
	}

	/**
	 * Customer returns from the hosted checkout (?wc-api=africa_wallet_return).
	 */
	public function handle_return() {
		$order_id = isset( $_GET['order_id'] ) ? absint( $_GET['order_id'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification
		$key      = isset( $_GET['key'] ) ? wc_clean( wp_unslash( $_GET['key'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		$order    = wc_get_order( $order_id );

		if ( ! $order || ! hash_equals( $order->get_order_key(), $key ) ) {
			wp_safe_redirect( wc_get_cart_url() );
			exit;
		}

		$this->sync_order( $order );

		if ( $order->is_paid() ) {
			wp_safe_redirect( $this->get_return_url( $order ) );
		} else {
			wc_add_notice( __( 'Your Africa Wallet payment was not completed. Please try again.', 'africa-wallet' ), 'error' );
			wp_safe_redirect( wc_get_checkout_url() );
		}
		exit;
	}

	/**
	 * Webhook from Africa Wallet (?wc-api=africa_wallet_webhook).
	 * Signature is checked when a secret is configured; the order status is always
	 * re-confirmed with the API, so the payload itself is never trusted.
	 */
	public function handle_webhook() {
		$raw_body = file_get_contents( 'php://input' );
		$secret   = $this->get_option( 'webhook_secret' );
		$header   = isset( $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ) ? wp_unslash( $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput

		if ( '' !== $secret && ! Africa_Wallet_Api::verify_signature( $raw_body, $header, $secret ) ) {
			status_header( 401 );
			wp_send_json( array( 'error' => 'invalid signature' ), 401 );
		}

		$event = json_decode( $raw_body, true );
		if ( isset( $event['type'] ) && 'payment.completed' === $event['type'] && ! empty( $event['data']['object']['id'] ) ) {
			$orders = wc_get_orders(
				array(
					'limit'      => 1,
					'meta_query' => array( // phpcs:ignore WordPress.DB.SlowDBQuery
						array(
							'key'   => self::META_CHECKOUT_ID,
							'value' => sanitize_text_field( $event['data']['object']['id'] ),
						),
					),
				)
			);
			if ( ! empty( $orders ) ) {
				$this->sync_order( $orders[0] );
			}
		}

		wp_send_json( array( 'received' => true ), 200 );
	}
}
