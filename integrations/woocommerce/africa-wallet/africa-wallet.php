<?php
/**
 * Plugin Name:          Africa Wallet for WooCommerce
 * Description:          Accept payments with Africa Wallet. Customers pay with their wallet balance on a hosted checkout page. Test mode only – no real money is moved.
 * Version:              0.1.0
 * Requires at least:    6.0
 * Requires PHP:         7.4
 * WC requires at least: 8.0
 * Text Domain:          africa-wallet
 * License:              GPL-2.0-or-later
 */

defined( 'ABSPATH' ) || exit;

define( 'AFRICA_WALLET_VERSION', '0.1.0' );
define( 'AFRICA_WALLET_PLUGIN_FILE', __FILE__ );
define( 'AFRICA_WALLET_DEFAULT_API', 'https://money-flow-ctwf.vercel.app' );

// Declare compatibility with HPOS (custom order tables) and the block checkout
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
		}
	}
);

add_action(
	'plugins_loaded',
	function () {
		if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
			return; // WooCommerce is not active
		}
		require_once __DIR__ . '/includes/class-africa-wallet-api.php';
		require_once __DIR__ . '/includes/class-africa-wallet-gateway.php';

		add_filter(
			'woocommerce_payment_gateways',
			function ( $gateways ) {
				$gateways[] = 'Africa_Wallet_Gateway';
				return $gateways;
			}
		);
	}
);

// Register the payment method for the block checkout (default since WooCommerce 8.3)
add_action(
	'woocommerce_blocks_loaded',
	function () {
		if ( ! class_exists( \Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType::class ) ) {
			return;
		}
		require_once __DIR__ . '/includes/class-africa-wallet-blocks.php';

		add_action(
			'woocommerce_blocks_payment_method_type_registration',
			function ( $registry ) {
				$registry->register( new Africa_Wallet_Blocks() );
			}
		);
	}
);
