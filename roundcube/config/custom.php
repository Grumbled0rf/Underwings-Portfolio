<?php
// Fix cert mismatch: Stalwart cert is for mail.underwings.org, not 'stalwart'
$config['smtp_conn_options'] = [
    'ssl' => [
        'verify_peer'      => false,
        'verify_peer_name' => false,
    ],
];
$config['imap_conn_options'] = [
    'ssl' => [
        'verify_peer'      => false,
        'verify_peer_name' => false,
    ],
];

// Use PLAIN auth (required by Stalwart on submission port)
$config['smtp_auth_type'] = 'PLAIN';

// HTTPS behind reverse proxy — fixes "session invalid" errors
$config['use_https'] = true;

// Underwings custom skin logo
$config['skin_logo'] = [
    '*'        => 'skins/underwings/images/logo.png',
    '*[small]' => 'skins/underwings/images/logo.png',
];

// ---------------------------------------------------------------
// HTML composer + HTML signatures
// Roundcube default is 0 (plain text only), which hides the HTML
// signature toggle entirely. 2 = HTML when replying to HTML, plain
// text otherwise — gives users the "HTML signature" option in
// Settings → Identities and uses it on every new message.
// ---------------------------------------------------------------
$config['htmleditor']        = 2;
$config['enable_spellcheck'] = true;

// Allow remote images (logo.png in the brand signature, GIF trackers
// in vendor templates, etc). 1 = show from contacts only, 2 = always.
$config['show_images'] = 2;
