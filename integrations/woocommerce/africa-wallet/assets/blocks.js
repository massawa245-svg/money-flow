/**
 * Registers Africa Wallet as a payment method in the WooCommerce block checkout.
 * Plain script without a build step; uses the globals WooCommerce provides.
 */
( function () {
	const { registerPaymentMethod } = window.wc.wcBlocksRegistry;
	const { getSetting } = window.wc.wcSettings;
	const { createElement } = window.wp.element;
	const { decodeEntities } = window.wp.htmlEntities;

	const settings = getSetting( 'africa_wallet_data', {} );
	const title = decodeEntities( settings.title || 'Pay with Africa Wallet' );
	const description = decodeEntities( settings.description || '' );

	const Content = () => createElement( 'div', null, description );

	registerPaymentMethod( {
		name: 'africa_wallet',
		label: createElement( 'span', null, title ),
		ariaLabel: title,
		content: createElement( Content ),
		edit: createElement( Content ),
		canMakePayment: () => true,
		supports: { features: settings.supports || [ 'products' ] },
	} );
} )();
