<?php
/**
 * Makes the gateway available in the block-based checkout (default since WooCommerce 8.3).
 */

defined( 'ABSPATH' ) || exit;

use Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType;

final class Africa_Wallet_Blocks extends AbstractPaymentMethodType {

	protected $name = 'africa_wallet';

	public function initialize() {
		$this->settings = get_option( 'woocommerce_africa_wallet_settings', array() );
	}

	public function is_active() {
		return isset( $this->settings['enabled'] ) && 'yes' === $this->settings['enabled'] && ! empty( $this->settings['secret_key'] );
	}

	public function get_payment_method_script_handles() {
		wp_register_script(
			'africa-wallet-blocks',
			plugins_url( 'assets/blocks.js', AFRICA_WALLET_PLUGIN_FILE ),
			array( 'wc-blocks-registry', 'wc-settings', 'wp-element', 'wp-html-entities' ),
			AFRICA_WALLET_VERSION,
			true
		);
		return array( 'africa-wallet-blocks' );
	}

	public function get_payment_method_data() {
		return array(
			'title'       => $this->get_setting( 'title', __( 'Pay with Africa Wallet', 'africa-wallet' ) ),
			'description' => $this->get_setting( 'description', '' ),
			'supports'    => array( 'products' ),
		);
	}
}
