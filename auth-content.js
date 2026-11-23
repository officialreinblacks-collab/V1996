/* MarketPlusView page texts: About, CEO, Questions and answers, Privacy, Terms, Licence. Edit the wording here. */
window.MPV_CONTENT = function (X) {
  var SUPPORT = X.SUPPORT, WA_NUM = X.WA_NUM, WA_SHOW = X.WA_SHOW, BIZ = X.BIZ, APP_VER = X.APP_VER, WM = X.WM, contactsHtml = X.contactsHtml;
  return {
    about: function () {
      return '<p>MarketPlusView is a fast trading view tool that helps traders and investors analyse the market with live crypto charts, indicators, buy / sell signals, alerts and more. Our aim is to help you experience different markets.</p>' +
      '<div class="k">Version</div><p>' + APP_VER + '</p>' +
      '<div class="k">What you get</div><ul><li>Live crypto charts with many chart types and time frames</li><li>Indicators, strategies and drawing tools</li><li>BUY / SELL signals with stop loss and take-profit levels</li><li>Price alerts and push alerts</li><li>Watchlists, replay, scanner and trade calculator</li></ul>' +
      '<div class="k">Chief Executive Officer</div><p>' + BIZ.owner + '</p>' +
      '<div class="k">Registered under</div><p>' + BIZ.name + '</p>' +
      '<div class="k">Business No.</div><p>' + BIZ.no + '</p>' +
      '<div class="k">Location</div><p>' + BIZ.loc + '</p>' +
      '<div class="k">Please note</div><p>MarketPlusView provides trading analysis tools only. We are not a broker, we do not hold, manage or send money, and nothing here is financial advice. Trading involves risk; no tool guarantees profits. Signals are based on past prices and can be wrong.</p>' +
      '<div class="k">Data and credits</div><p>Market data comes from public exchange feeds and may be delayed or incorrect. Charts are drawn with TradingView Lightweight Charts (Apache 2.0, \u00a9 TradingView, Inc., tradingview.com). Some indicators are our own ports of open scripts by their authors, who keep their credit: for example MarkitTick, LuxAlgo and others named inside each tool\u2019s guide.</p>' +
      '<div class="k">Legal</div><p><a href="#" id="mpvAbT" style="color:#93b4ff">Terms and conditions</a> \u00b7 <a href="#" id="mpvAbP" style="color:#93b4ff">Privacy policy</a> \u00b7 <a href="#" id="mpvAbF" style="color:#93b4ff">Questions and answers</a></p>' +
      '<div class="k">Contact</div><p><a href="mailto:' + SUPPORT + '" style="color:#93b4ff">' + SUPPORT + '</a><br><a href="https://wa.me/' + WA_NUM + '" target="_blank" rel="noopener" style="color:#93b4ff">WhatsApp ' + WA_SHOW + '</a></p>';
    },
    ceo: function () {
      return '<div class="mpv-ceo"><div class="mpv-ceoh"><img class="ph" src="https://res.cloudinary.com/datfuxotx/image/upload/v1793259581/file_00000000712c8243b7da213b8c35d2fc_gauco9.png" alt="Reinhard Mugambi (Reinblacks)" loading="lazy"><h2>Meet the Founder \u2014 Reinhard Mugambi (Reinblacks)</h2></div><div class="mpv-ceob">' +
      '<p>Hello, my name is Reinhard Mugambi, popularly known as Reinblacks. I was born on 8 September 1996 in Nairobi, Kenya.</p>' +
      '<p>I am an AI Coding Engineer and Crypto Investor, the founder of \u201cMarketPlusView.com\u201d (<a href="https://marketplusview.com" target="_blank" rel="noopener">https://marketplusview.com</a>) and \u201cReinblacksCreativz.com\u201d (<a href="https://reinblackscreativz.com" target="_blank" rel="noopener">https://reinblackscreativz.com</a>), and the CEO of Reinblacks Digital.</p>' +
      '<p>I don\u2019t claim to know everything, and I don\u2019t believe perfection is a requirement for growth. I believe in learning through experience, exploring new possibilities, and continuously expanding my knowledge. One principle has always guided me: the more information you have, the more you can understand.</p>' +
      '<h3>My Vision for MarketPlusView</h3>' +
      '<p>The vision behind MarketPlusView.com is to help traders and investors see the financial markets from different perspectives, explore different analytical approaches, and develop a deeper understanding of market movements.</p>' +
      '<p>Think about it: a trader using Fibonacci retracement may interpret the market differently from someone relying on the 200 EMA. Another trader may focus on candlestick patterns, while someone else may study different timeframes. Their conclusions may differ because they are looking at the same market through different analytical lenses.</p>' +
      '<p>Beyond technical tools, information, experience, and mentality also influence how we interpret what we see.</p>' +
      '<p>The market may be the same, but the way we see it can make all the difference.</p>' +
      '<p>That is the idea behind MarketPlusView: to encourage broader perspectives, deeper analysis, and more informed decision-making.</p>' +
      '<h3>My Philosophy</h3>' +
      '<p>My goal is not to promise you profits or tell you that there is only one way to make money in the markets. Instead, my aim is to help you explore different approaches, understand how they work, and discover which methods may best suit your own trading or investment strategy.</p>' +
      '<p>I believe that knowledge should expand your perspective, not limit it. The more angles you explore, the better equipped you may become to evaluate opportunities, recognize risks, and make decisions for yourself.</p>' +
      '<p>Ultimately, the responsibility for every trading or investment decision remains yours. My mission is to help you see more, question more, and understand more.</p>' +
      '<h3>A Message to You</h3>' +
      '<p>Whether you are a beginner or an experienced trader or investor, I wish you success in your journey.</p>' +
      '<p>Keep learning. Keep exploring. Keep improving your understanding.</p>' +
      '<p>Never assume that what you see is everything there is to see. Sometimes, a different perspective can change the way you understand the entire market.</p>' +
      '<p>Your journey. Your strategy. Your perspective.</p>' +
      '<p>Wishing you all the best in your trading and investment journey.</p>' +
      '<p class="sig">Reinhard Mugambi (Reinblacks)<span>Founder of MarketPlusView.com</span><span>Founder of Reinblacks Creativz</span><span>CEO of Reinblacks Digital</span></p></div></div>';
    },
    faq: function () {
    var Q = [
      ['What is MarketPlusView?', 'A trading analysis app with live crypto charts, indicators, strategies, BUY / SELL signals, alerts and drawing tools. It is not a broker and you cannot trade or deposit money in it.'],
      ['Is it free?', 'Yes. The Free plan stays free, with no trial timer. New accounts also get one free 7-day Pro Plus Metal trial, no card needed. The paid plan, Pro Plus Metal, is USD 19 per month, paid online. Yearly is USD 190 (2 months free).'],
      ['How do I pay and activate?', 'Open Subscription, tap Get Pro Plus Metal and choose how to pay. After the payment is confirmed we send you an invite code. Open Account, tap Enter a code and activate it. Payment is renewed manually each month with a new code.'],
      ['My payment is not confirmed yet', 'Payments can take a few minutes. If it takes longer, send us the payment proof by email or WhatsApp from the Help Center.'],
      ['Are the signals advice? Do they repaint?', 'No, they are not financial advice. Strategy signals appear after the candle has closed and do not repaint, but they can still be wrong. Always use a stop loss and your own judgement.'],
      ['How do alerts work?', 'In-app alerts work while the app is open. Push alerts can reach you when the app is closed after you connect them in the alert settings. Some phones need battery saving turned off for the app.'],
      ['Which markets and time frames are supported?', 'Live crypto markets from public exchange feeds, from 1 minute up to weekly candles. Data can be delayed or incorrect at times.'],
      ['Is my data saved?', 'Your watchlists, drawings and settings are saved on your device. Your account email and plan are kept on our server so you can sign in. See the Privacy policy for details.'],
      ['I forgot my password', 'On the sign-in screen use the forgot password link, or contact support from the Help Center.'],
      ['I changed phone. How do I get my plan back?', 'Sign in with the same email and your plan comes back. Settings and drawings stored only on the old phone do not move automatically.'],
      ['Can I share my account or code?', 'No. A code and an account are for one person. Sharing or reselling can lead to access being removed.'],
      ['How do I delete my account?', 'Open Account, then Delete account, and send the request. We delete your account and data after checking it is you.'],
      ['How do I contact support?', 'Use the Help Center in Account: email ' + SUPPORT + ' or WhatsApp ' + WA_SHOW + '.']
    ];
      return Q.map(function (q) { return '<details><summary>' + q[0] + '</summary><p>' + q[1] + '</p></details>'; }).join('');
    },
    privacy: function () {
      return '<p>This policy is a draft and will be updated. It explains what MarketPlusView collects and why.</p>' +
      '<div class="k">What we collect</div><ul><li>Your email address and password (the password is handled by our sign-in provider and is not readable by us)</li><li>Your plan, expiry date, trial status and the invite codes you use</li><li>If you turn on push alerts: a push subscription from your browser or phone, and the alert rules you set</li><li>Messages you send to support</li></ul>' +
      '<div class="k">Stored on your device</div><p>Watchlists, drawings, layouts, indicator settings and preferences are stored in your device storage. Clearing app data removes them.</p>' +
      '<div class="k">What we do not do</div><p>We do not sell your data, and we do not collect or store your exchange keys, wallet keys or card numbers. MarketPlusView cannot trade for you.</p>' +
      '<div class="k">Ads</div><p>Free plan and guest accounts may see sponsored banners and Pro Plus Metal invites while the charts are open. Pro Plus Metal members see no ads. A sponsored banner only takes you to the partner\u2019s site (for example Binance) when you tap it. We do not send that site your email or plan, and its own privacy policy applies once you leave.</p>' +
      '<div class="k">Third parties</div><p>Sign-in and account data are stored with our backend provider (Supabase). Payments are made on the payment provider\u2019s own page. Market data is requested from public exchange feeds, which can see your device\u2019s IP address like any website. The chart library and some files load from public content networks.</p>' +
      '<div class="k">Keeping and deleting data</div><p>We keep your account data while your account exists. You can ask for it to be deleted at any time from Account, Delete account.</p>' +
      '<div class="k">Children</div><p>MarketPlusView is for adults. It is not meant for anyone under 18.</p>' +
      '<div class="k">Contact</div><p>' + contactsHtml() + '</p>';
    },
    terms: function () {
      return '<p>These terms are a draft and will be updated. By using MarketPlusView you agree to them.</p>' +
      '<div class="k">1. The service</div><p>MarketPlusView provides charting and trading analysis tools. We are not a broker, we do not hold, manage or send your money, and nothing in the app is financial advice. Trading involves risk and no tool guarantees profit. You are responsible for your own trading decisions.</p>' +
      '<div class="k">2. Accounts and invite codes</div><p>Access needs an account and an invite code. Your code is for you only. Sharing or reselling codes or accounts may lead to access being removed.</p>' +
      '<div class="k">3. Free trial</div><p>One free 7-day trial with full Pro Plus Metal access is allowed per person. No card is needed.</p>' +
      '<div class="k">4. Payments</div><p>The paid plan, Pro Plus Metal, costs USD 19 per month (USD 190 per year), paid online. Renewal is manual: you pay again and receive a new code each month. Some payments cannot normally be reversed, so contact support if something goes wrong with a payment.</p>' +
      '<div class="k">5. Availability</div><p>We work to keep the app available and the data accurate, but we cannot promise it is always uninterrupted or error free. Market data may be delayed or incorrect.</p>' +
      '<div class="k">6. Changes</div><p>We may change features, prices or these terms. Continued use means you accept the updated terms.</p>' +
      '<div class="k">7. Contact</div><p>' + contactsHtml() + '</p>';
    },
    licence: function () {
      return '<div class="k">Product</div><p>' + WM + '</p>' +
      '<div class="k">Business name</div><p>' + BIZ.name + '</p>' +
      '<div class="k">Business registration No.</div><p>' + BIZ.no + '</p>' +
      '<div class="k">Registered under</div><p>' + BIZ.owner + '</p>' +
      '<div class="k">Nature of business</div><p>' + BIZ.nature + '</p>' +
      '<div class="k">Registration date</div><p>' + BIZ.date + '</p>' +
      '<div class="k">Registered with</div><p>Business Registration Service (BRS), Republic of Kenya</p>' +
      '<div class="k">Location</div><p>' + BIZ.loc + '</p>' +
      '<div class="k">Please note</div><p>This is a business registration. MarketPlusView provides trading analysis software only. We are not a broker or a licensed financial adviser.</p>';
    }
  };
};
