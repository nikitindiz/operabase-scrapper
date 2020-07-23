const fetch = require('node-fetch');
const jsdom = require("jsdom");
const qs = require("qs");
const { JSDOM } = jsdom;

const fetchMainPage = (bodyString) => fetch("https://www.operabase.com/en", {
    "headers": {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,ru;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        "pragma": "no-cache",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        // "cookie": "__cfduid=d36b02f28014c40d6f6ef7b6271cb14671595338692; __stripe_mid=01368888-3b09-41d9-89fe-bb873a54ebbf; ajs_anonymous_id=%22ed07ed33-877c-4a9d-a68d-d2de08f5704c%22; _ga=GA1.2.1007238604.1595338694; _fbp=fb.1.1595338694210.1500331582; hubspotutk=d32413f82c91c889f5ce2aa121f1de58; messagesUtk=253e618cb9ac4de582906547da8bb424; Operabase=true; PHPSESSID=a7v1cgfr15bv8kujg6jm5ia3da; __stripe_sid=eb84ffab-7a05-4d20-9c79-32c84eb3d715; _gid=GA1.2.1175335665.1595512885; __hstc=238399583.d32413f82c91c889f5ce2aa121f1de58.1595338695370.1595338695370.1595512885659.2; __hssrc=1; __hssc=238399583.1.1595512885659; _gat=1"
    },
    "referrer": "https://www.operabase.com/en",
    "referrerPolicy": "no-referrer-when-downgrade",
    "body": bodyString,
    "method": "POST",
    "mode": "cors"
});

const parseResult = async (pageText) => {
    const dom = new JSDOM(pageText);
    const { document } = dom.window;

    const dataNodes = Array.from(document.querySelectorAll('#cities_result > .companies_work_bordered'));

    let completeDataNodes = dataNodes.map(node => {
        const parent = node.parentNode;

        const [ id, someElseId, statut, lang, begin, end, dotL ] = parent
            .querySelector('.companies_prod_title')
            .getAttribute('onclick')
            .replace('show_prod_tour', '')
            .replace('(', '')
            .replace(')', '')
            .split(',')
            .map(item => item.replace(/\'/g, '').trim().replace(/\s/g, '+'));

        let requestQueryObject = { id, someElseId, statut, lang, begin, end, dotL };

        return ({
            briefInfoElement: {
                element: node,
                text: node.textContent,
            },
            festivalInfoElement: {
                element: node.nextSibling,
                text: node.nextSibling.textContent,
            },
            completeInfoInfoElement: {
                element: node.nextSibling.nextSibling,
                id: node.nextSibling.nextSibling.getAttribute("id").replace('content_', ''),
                requestQueryObject,
            },
        });
    });

    for (const node of completeDataNodes) {
        const { completeInfoInfoElement } = node;

        // const queryObject = {
        //     id: completeInfoInfoElement.id,
        //     statut: '',
        //     lang: 'en',
        //     begin: '20200723',
        //     end: '',
        //     // dotL: 'uk.Liverpool.Empire+Theatre',
        // };


        // https://www.operabase.com/ressources/views/festivals/season_prod_fetch.php?id=132039&statut=&lang=en&begin=20200723&end=&dotL=uk.Liverpool.Empire+Theatre

        // https://www.operabase.com/ressources/views/festivals/season_prod_fetch.php?id=1032569&statut=&lang=en&begin=20200723&end=&dotL=uk.Liverpool.Empire+Theatre

        const queryString = qs.stringify(completeInfoInfoElement.requestQueryObject);

        console.log(queryString);

        const additionalDataResponse = await fetch(`https://www.operabase.com/ressources/views/festivals/season_prod_fetch.php?${queryString}`, {
            "headers": {
                "accept": "*/*",
                "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,ru;q=0.7",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest",
            },
            "referrer": "https://www.operabase.com/en",
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": null,
            "method": "GET",
            "mode": "cors"
        });

        const responseText = await additionalDataResponse.text();

        console.log(responseText)

        const additionalDom = new JSDOM(`<!DOCTYPE html><body>${responseText}</body>`);
        const { document } = additionalDom.window;

        node.asText = document.querySelector('body').textContent;

        console.log(node.asText);
    }

    for (const node of completeDataNodes) {
        delete node.briefInfoElement.element;
        delete node.festivalInfoElement.element;
        delete node.completeInfoInfoElement.element;
    }

    return completeDataNodes;
}

const getInfo = async (req, res) => {
    const {
        country_iso,
        city,
        company,
        company_name,
        dotL,
        comp_id,
        comp_name,
        work_id,
        work_name,
        artist_name,
        artist_id,
        from,
        to,
        default_venue,
    } = req.body;

    const body = qs.stringify({
        country_iso,
        city,
        company,
        company_name,
        dotL,
        comp_id,
        comp_name,
        work_id,
        work_name,
        artist_name,
        artist_id,
        from,
        to,
        default_venue,
    });

    try {
        const response = await fetchMainPage(body);

        try {
            const pageText = await response.text();
            const result = await parseResult(pageText);

            res.send({
                err: null,
                // pageAsText: result,
                result,
            });
        } catch (resultToJSONErr) {
            res.send({
                err: resultToJSONErr.message,
            });
        }
    } catch (fetchErr) {
        res.send({
            err: fetchErr.message,
        });
    }
};

module.exports = {
    getInfo,
};