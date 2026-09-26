=== Africa Wallet for WooCommerce ===
Tags: payments, wallet, africa, checkout
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
WC requires at least: 8.0
Stable tag: 0.1.0
License: GPLv2 or later

Accept payments with Africa Wallet. Works with the classic and the block checkout.

== Description ==

Customers choose "Pay with Africa Wallet" at checkout, are redirected to a secure hosted
payment page, pay with their wallet balance and come back to your shop. The order is set
to "Processing" automatically.

TEST MODE: Africa Wallet currently runs in test mode. No real money is moved.

== Installation ==

1. In your Africa Wallet merchant account open "Cashier" > "Connect online shop".
2. Create an API key (sk_test_...) and copy it.
3. In WordPress go to Plugins > Add New > Upload Plugin and upload africa-wallet.zip. Activate it.
4. Go to WooCommerce > Settings > Payments > Africa Wallet, enable it and paste the API key.
5. Copy the webhook URL shown under "Webhook signing secret", add it as a webhook in your
   Africa Wallet account and paste the whsec_... secret back into the plugin settings.

The webhook is optional but recommended: it completes the order even if the customer closes
the browser before returning to your shop.

== Requirements ==

* Your shop must use HTTPS (return URLs must be https).
* The shop currency must match the currency of your Africa Wallet merchant account.

== Security ==

The plugin never trusts the return URL or the webhook payload alone. Before an order is
marked as paid, the plugin asks the Africa Wallet API for the checkout status and checks
that amount and currency match the order.
