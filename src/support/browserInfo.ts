import { IncomingHttpHeaders } from 'http';

export default function(headers: IncomingHttpHeaders) {
    const userAgent = headers['user-agent'] || '';
    const acceptLanguage = headers['accept-language'];
    const info = {
        version: '',
        device: '',
        os: '',
        osVersion: '',
        browser: '',
        engine: '',
        language: '',
    };

    const match = {
        // 内核
        Trident: userAgent.indexOf('Trident') > -1 || userAgent.indexOf('NET CLR') > -1,
        Presto: userAgent.indexOf('Presto') > -1,
        WebKit: userAgent.indexOf('AppleWebKit') > -1,
        Gecko: userAgent.indexOf('Gecko/') > -1,
        // 浏览器
        Safari: userAgent.indexOf('Safari') > -1,
        Chrome: userAgent.indexOf('Chrome') > -1 || userAgent.indexOf('CriOS') > -1,
        IE: userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1,
        Edge: userAgent.indexOf('Edge') > -1,
        Firefox: userAgent.indexOf('Firefox') > -1 || userAgent.indexOf('FxiOS') > -1,
        'Firefox Focus': userAgent.indexOf('Focus') > -1,
        Chromium: userAgent.indexOf('Chromium') > -1,
        Opera: userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1,
        Vivaldi: userAgent.indexOf('Vivaldi') > -1,
        Yandex: userAgent.indexOf('YaBrowser') > -1,
        Arora: userAgent.indexOf('Arora') > -1,
        Lunascape: userAgent.indexOf('Lunascape') > -1,
        QupZilla: userAgent.indexOf('QupZilla') > -1,
        'Coc Coc': userAgent.indexOf('coc_coc_browser') > -1,
        Kindle: userAgent.indexOf('Kindle') > -1 || userAgent.indexOf('Silk/') > -1,
        Iceweasel: userAgent.indexOf('Iceweasel') > -1,
        Konqueror: userAgent.indexOf('Konqueror') > -1,
        Iceape: userAgent.indexOf('Iceape') > -1,
        SeaMonkey: userAgent.indexOf('SeaMonkey') > -1,
        Epiphany: userAgent.indexOf('Epiphany') > -1,
        ['360']: userAgent.indexOf('QihooBrowser') > -1 || userAgent.indexOf('QHBrowser') > -1,
        '360EE': userAgent.indexOf('360EE') > -1,
        '360SE': userAgent.indexOf('360SE') > -1,
        UC: userAgent.indexOf('UC') > -1 || userAgent.indexOf(' UBrowser') > -1,
        QQBrowser: userAgent.indexOf('QQBrowser') > -1,
        QQ: userAgent.indexOf('QQ/') > -1,
        Baidu:
            userAgent.indexOf('Baidu') > -1 ||
            userAgent.indexOf('BIDUBrowser') > -1 ||
            userAgent.indexOf('baiduboxapp') > -1,
        Maxthon: userAgent.indexOf('Maxthon') > -1,
        Sogou: userAgent.indexOf('MetaSr') > -1 || userAgent.indexOf('Sogou') > -1,
        LBBROWSER: userAgent.indexOf('LBBROWSER') > -1,
        '2345Explorer': userAgent.indexOf('2345Explorer') > -1 || userAgent.indexOf('Mb2345Browser') > -1,
        TheWorld: userAgent.indexOf('TheWorld') > -1,
        XiaoMi: userAgent.indexOf('MiuiBrowser') > -1,
        Quark: userAgent.indexOf('Quark') > -1,
        Qiyu: userAgent.indexOf('Qiyu') > -1,
        Wechat: userAgent.indexOf('MicroMessenger') > -1,
        Taobao: userAgent.indexOf('AliApp(TB') > -1,
        Alipay: userAgent.indexOf('AliApp(AP') > -1,
        Weibo: userAgent.indexOf('Weibo') > -1,
        Douban: userAgent.indexOf('com.douban.frodo') > -1,
        Suning: userAgent.indexOf('SNEBUY-APP') > -1,
        iQiYi: userAgent.indexOf('IqiyiApp') > -1,
        DingTalk: userAgent.indexOf('DingTalk') > -1,
        Huawei: userAgent.indexOf('Build/HUAWEI') > -1,
        // 系统或平台
        Windows: userAgent.indexOf('Windows') > -1,
        Linux: userAgent.indexOf('Linux') > -1 || userAgent.indexOf('X11') > -1,
        'Mac OS': userAgent.indexOf('Macintosh') > -1,
        Android: userAgent.indexOf('Android') > -1 || userAgent.indexOf('Adr') > -1,
        Ubuntu: userAgent.indexOf('Ubuntu') > -1,
        FreeBSD: userAgent.indexOf('FreeBSD') > -1,
        Debian: userAgent.indexOf('Debian') > -1,
        'Windows Phone': userAgent.indexOf('IEMobile') > -1 || userAgent.indexOf('Windows Phone') > -1,
        BlackBerry: userAgent.indexOf('BlackBerry') > -1 || userAgent.indexOf('RIM') > -1,
        MeeGo: userAgent.indexOf('MeeGo') > -1,
        Symbian: userAgent.indexOf('Symbian') > -1,
        iOS: userAgent.indexOf('like Mac OS X') > -1,
        'Chrome OS': userAgent.indexOf('CrOS') > -1,
        WebOS: userAgent.indexOf('hpwOS') > -1,
        // 设备
        Mobile: userAgent.indexOf('Mobi') > -1 || userAgent.indexOf('iPh') > -1 || userAgent.indexOf('480') > -1,
        Tablet: userAgent.indexOf('Tablet') > -1 || userAgent.indexOf('Pad') > -1 || userAgent.indexOf('Nexus 7') > -1,
    };
    // let is360 = false;
    // if (_window.chrome) {
    //     var chrome_vision = u.replace(/^.*Chrome\/([\d]+).*$/, '$1');
    //     if (_window.chrome.adblock2345 || _window.chrome.common2345) {
    //         match['2345Explorer'] = true;
    //     } else if (
    //         _mime('type', 'application/360softmgrplugin') ||
    //         _mime('type', 'application/mozilla-npqihooquicklogin')
    //     ) {
    //         is360 = true;
    //     } else if (chrome_vision > 36 && _window.showModalDialog) {
    //         is360 = true;
    //     } else if (chrome_vision > 45) {
    //         is360 = _mime('type', 'application/vnd.chromium.remoting-viewer');
    //     }
    // }

    // 修正
    // if (match.Mobile) {
    //     match.Mobile = !(u.indexOf('iPad') > -1);
    // } else if (is360) {
    //     if (_mime('type', 'application/gameplugin')) {
    //         match['360SE'] = true;
    //     } else if (
    //         _navigator &&
    //         typeof _navigator['connection'] !== 'undefined' &&
    //         typeof _navigator['connection']['saveData'] == 'undefined'
    //     ) {
    //         match['360SE'] = true;
    //     } else {
    //         match['360EE'] = true;
    //     }
    // }
    // if (match.IE || match.Edge) {
    //     // var navigator_top = window.screenTop - window.screenY;
    //     switch (navigator_top) {
    //         case 71: //无收藏栏,贴边
    //         case 74: //无收藏栏,非贴边
    //         case 99: //有收藏栏,贴边
    //         case 102: //有收藏栏,非贴边
    //             match['360EE'] = true;
    //             break;
    //         case 75: //无收藏栏,贴边
    //         case 74: //无收藏栏,非贴边
    //         case 105: //有收藏栏,贴边
    //         case 104: //有收藏栏,非贴边
    //             match['360SE'] = true;
    //             break;
    //     }
    // }
    if (match.Baidu && match.Opera) {
        match.Baidu = false;
    } else if (match.iOS) {
        match.Safari = true;
    }
    // 基本信息
    const hash = {
        engine: ['WebKit', 'Trident', 'Gecko', 'Presto'],
        browser: [
            'Safari',
            'Chrome',
            'Edge',
            'IE',
            'Firefox',
            'Firefox Focus',
            'Chromium',
            'Opera',
            'Vivaldi',
            'Yandex',
            'Arora',
            'Lunascape',
            'QupZilla',
            'Coc Coc',
            'Kindle',
            'Iceweasel',
            'Konqueror',
            'Iceape',
            'SeaMonkey',
            'Epiphany',
            'XiaoMi',
            'Huawei',
            '360',
            '360SE',
            '360EE',
            'UC',
            'QQBrowser',
            'QQ',
            'Baidu',
            'Maxthon',
            'Sogou',
            'LBBROWSER',
            '2345Explorer',
            'TheWorld',
            'Quark',
            'Qiyu',
            'Wechat',
            'Taobao',
            'Alipay',
            'Weibo',
            'Douban',
            'Suning',
            'iQiYi',
            'DingTalk',
        ],
        os: [
            'Windows',
            'Linux',
            'Mac OS',
            'Android',
            'Ubuntu',
            'FreeBSD',
            'Debian',
            'iOS',
            'Windows Phone',
            'BlackBerry',
            'MeeGo',
            'Symbian',
            'Chrome OS',
            'WebOS',
        ],
        device: ['Mobile', 'Tablet'],
    };
    info.device = 'PC';
    // info.language = (() => {
    //     const g = _navigator.browserLanguage || _navigator.language;
    //     const arr = g.split('-');
    //     if (arr[1]) {
    //         arr[1] = arr[1].toUpperCase();
    //     }
    //     return arr.join('_');
    // })();
    Object.keys(hash).forEach((k) => {
        ((hash as any)[k] as string[]).forEach((value) => {
            if ((match as any)[value]) {
                (info as any)[k] = value;
            }
        });
    });
    // 系统版本信息
    const osVersion = {
        Windows() {
            const v = userAgent.replace(/^Mozilla\/\d.0 \(Windows NT ([\d.]+);.*$/, '$1');
            const vhash = {
                ['10']: '10',
                ['6.4']: '10',
                ['6.3']: '8.1',
                ['6.2']: '8',
                ['6.1']: '7',
                ['6.0']: 'Vista',
                ['5.2']: 'XP',
                ['5.1']: 'XP',
                ['5.0']: '2000',
            };
            return (vhash as any)[v] || v;
        },
        Android() {
            return userAgent.replace(/^.*Android ([\d.]+);.*$/, '$1');
        },
        iOS() {
            return userAgent.replace(/^.*OS ([\d_]+) like.*$/, '$1').replace(/_/g, '.');
        },
        Debian() {
            return userAgent.replace(/^.*Debian\/([\d.]+).*$/, '$1');
        },
        'Windows Phone'() {
            return userAgent.replace(/^.*Windows Phone( OS)? ([\d.]+);.*$/, '$2');
        },
        'Mac OS'() {
            return userAgent.replace(/^.*Mac OS X ([\d_]+).*$/, '$1').replace(/_/g, '.');
        },
        WebOS() {
            return userAgent.replace(/^.*hpwOS\/([\d.]+);.*$/, '$1');
        },
    };
    info.osVersion = '';
    if (info.os in osVersion) {
        info.osVersion = (osVersion as any)[info.os]();
        if (info.osVersion === userAgent) {
            info.osVersion = '';
        }
    }
    // 浏览器版本信息
    const version = {
        Safari() {
            return userAgent.replace(/^.*Version\/([\d.]+).*$/, '$1');
        },
        Chrome() {
            return userAgent.replace(/^.*Chrome\/([\d.]+).*$/, '$1').replace(/^.*CriOS\/([\d.]+).*$/, '$1');
        },
        IE() {
            return userAgent.replace(/^.*MSIE ([\d.]+).*$/, '$1').replace(/^.*rv:([\d.]+).*$/, '$1');
        },
        Edge() {
            return userAgent.replace(/^.*Edge\/([\d.]+).*$/, '$1');
        },
        Firefox() {
            return userAgent.replace(/^.*Firefox\/([\d.]+).*$/, '$1').replace(/^.*FxiOS\/([\d.]+).*$/, '$1');
        },
        'Firefox Focus'() {
            return userAgent.replace(/^.*Focus\/([\d.]+).*$/, '$1');
        },
        Chromium() {
            return userAgent.replace(/^.*Chromium\/([\d.]+).*$/, '$1');
        },
        Opera() {
            return userAgent.replace(/^.*Opera\/([\d.]+).*$/, '$1').replace(/^.*OPR\/([\d.]+).*$/, '$1');
        },
        Vivaldi() {
            return userAgent.replace(/^.*Vivaldi\/([\d.]+).*$/, '$1');
        },
        Yandex() {
            return userAgent.replace(/^.*YaBrowser\/([\d.]+).*$/, '$1');
        },
        Arora() {
            return userAgent.replace(/^.*Arora\/([\d.]+).*$/, '$1');
        },
        Lunascape() {
            return userAgent.replace(/^.*Lunascape[\/\s]([\d.]+).*$/, '$1');
        },
        QupZilla() {
            return userAgent.replace(/^.*QupZilla[\/\s]([\d.]+).*$/, '$1');
        },
        'Coc Coc'() {
            return userAgent.replace(/^.*coc_coc_browser\/([\d.]+).*$/, '$1');
        },
        Kindle() {
            return userAgent.replace(/^.*Version\/([\d.]+).*$/, '$1');
        },
        Iceweasel() {
            return userAgent.replace(/^.*Iceweasel\/([\d.]+).*$/, '$1');
        },
        Konqueror() {
            return userAgent.replace(/^.*Konqueror\/([\d.]+).*$/, '$1');
        },
        Iceape() {
            return userAgent.replace(/^.*Iceape\/([\d.]+).*$/, '$1');
        },
        SeaMonkey() {
            return userAgent.replace(/^.*SeaMonkey\/([\d.]+).*$/, '$1');
        },
        Epiphany() {
            return userAgent.replace(/^.*Epiphany\/([\d.]+).*$/, '$1');
        },
        ['360']() {
            return userAgent.replace(/^.*QihooBrowser\/([\d.]+).*$/, '$1');
        },
        '360SE'() {
            const sehash = {
                ['63']: '10.0',
                ['55']: '9.1',
                ['45']: '8.1',
                ['42']: '8.0',
                ['31']: '7.0',
                ['21']: '6.3',
            };
            const chromeVision = userAgent.replace(/^.*Chrome\/([\d]+).*$/, '$1');
            return (sehash as any)[chromeVision] || '';
        },
        '360EE'() {
            const eehash = { ['69']: '11.0', ['63']: '9.5', ['55']: '9.0', ['50']: '8.7', ['30']: '7.5' };
            const chromeVision = userAgent.replace(/^.*Chrome\/([\d]+).*$/, '$1');
            return (eehash as any)[chromeVision] || '';
        },
        Maxthon() {
            return userAgent.replace(/^.*Maxthon\/([\d.]+).*$/, '$1');
        },
        QQBrowser() {
            return userAgent.replace(/^.*QQBrowser\/([\d.]+).*$/, '$1');
        },
        QQ() {
            return userAgent.replace(/^.*QQ\/([\d.]+).*$/, '$1');
        },
        Baidu() {
            return userAgent
                .replace(/^.*BIDUBrowser[\s\/]([\d.]+).*$/, '$1')
                .replace(/^.*baiduboxapp\/([\d.]+).*$/, '$1');
        },
        UC() {
            return userAgent.replace(/^.*UC?Browser\/([\d.]+).*$/, '$1');
        },
        Sogou() {
            return userAgent.replace(/^.*SE ([\d.X]+).*$/, '$1').replace(/^.*SogouMobileBrowser\/([\d.]+).*$/, '$1');
        },
        LBBROWSER() {
            const lbhash = {
                ['57']: '6.5',
                ['49']: '6.0',
                ['46']: '5.9',
                ['42']: '5.3',
                ['39']: '5.2',
                ['34']: '5.0',
                ['29']: '4.5',
                ['21']: '4.0',
            };
            const chromeVision = navigator.userAgent.replace(/^.*Chrome\/([\d]+).*$/, '$1');
            return (lbhash as any)[chromeVision] || '';
        },
        '2345Explorer'() {
            const ehash = { ['69']: '10.0', ['55']: '9.9' };
            const chromeVision = navigator.userAgent.replace(/^.*Chrome\/([\d]+).*$/, '$1');
            return (
                (ehash as any)[chromeVision] ||
                userAgent.replace(/^.*2345Explorer\/([\d.]+).*$/, '$1').replace(/^.*Mb2345Browser\/([\d.]+).*$/, '$1')
            );
        },
        TheWorld() {
            return userAgent.replace(/^.*TheWorld ([\d.]+).*$/, '$1');
        },
        XiaoMi() {
            return userAgent.replace(/^.*MiuiBrowser\/([\d.]+).*$/, '$1');
        },
        Quark() {
            return userAgent.replace(/^.*Quark\/([\d.]+).*$/, '$1');
        },
        Qiyu() {
            return userAgent.replace(/^.*Qiyu\/([\d.]+).*$/, '$1');
        },
        Wechat() {
            return userAgent.replace(/^.*MicroMessenger\/([\d.]+).*$/, '$1');
        },
        Taobao() {
            return userAgent.replace(/^.*AliApp\(TB\/([\d.]+).*$/, '$1');
        },
        Alipay() {
            return userAgent.replace(/^.*AliApp\(AP\/([\d.]+).*$/, '$1');
        },
        Weibo() {
            return userAgent.replace(/^.*weibo__([\d.]+).*$/, '$1');
        },
        Douban() {
            return userAgent.replace(/^.*com.douban.frodo\/([\d.]+).*$/, '$1');
        },
        Suning() {
            return userAgent.replace(/^.*SNEBUY-APP([\d.]+).*$/, '$1');
        },
        iQiYi() {
            return userAgent.replace(/^.*IqiyiVersion\/([\d.]+).*$/, '$1');
        },
        DingTalk() {
            return userAgent.replace(/^.*DingTalk\/([\d.]+).*$/, '$1');
        },
        Huawei() {
            return userAgent.replace(/^.*Version\/([\d.]+).*$/, '$1');
        },
    };
    info.version = '';
    if ((version as any)[info.browser]) {
        info.version = (version as any)[info.browser]();
        if (info.version === userAgent) {
            info.version = '';
        }
    }
    // 修正
    if (info.browser === 'Edge') {
        info.engine = 'EdgeHTML';
    } else if (info.browser === 'Chrome' && Number(info.version) > 27) {
        info.engine = 'Blink';
    } else if (info.browser === 'Opera' && Number(info.version) > 12) {
        info.engine = 'Blink';
    } else if (info.browser === 'Yandex') {
        info.engine = 'Blink';
    }
    return info;
}
