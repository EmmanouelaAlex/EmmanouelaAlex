require('isomorphic-fetch');
const dotenv = require('dotenv');
const Koa = require('koa');
const next = require('next');
const { default: createShopifyAuth } = require('@shopify/koa-shopify-auth');
const { verifyRequest } = require('@shopify/koa-shopify-auth');
const session = require('koa-session');

const Router = require('@koa/router');
const axios = require('axios');

dotenv.config();
const { default: graphQLProxy } = require('@shopify/koa-shopify-graphql-proxy');
const { ApiVersion } = require('@shopify/koa-shopify-graphql-proxy');

const port = parseInt(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({dev});
const handle = app.getRequestHandler();

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY } = process.env;

app.prepare().then(() => {
    const server = new Koa();
    const router = new Router();

    server.use(session({secure: true, sameSite: 'none'}, server));
    server.keys = [SHOPIFY_API_SECRET_KEY];

    server.use(
        createShopifyAuth(
            {
                apiKey: SHOPIFY_API_KEY,
                secret: SHOPIFY_API_SECRET_KEY,
                scopes: ['read_products', 'write_products', 'read_script_tags', 'write_script_tags'],
                async afterAuth(ctx) {
                    const { shop, accessToken } = ctx.session;
                    ctx.redirect('https://' + shop + '/admin/apps');
                }
            }
        )
    );
    server.use(graphQLProxy({version: ApiVersion.October20}));
    
    server.use(verifyRequest());

    router.get('/getProducts', verifyRequest(), async(ctx, res) =>{
        const { shop, accessToken } = ctx.session;
        const url = `https://${shop}/admin/api/2021-07/products.json`;

        const shopifyHeader = (token) => ({
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token,
        });
        const getProducts = await axios.get(url, { headers: shopifyHeader(accessToken) });

        ctx.body = getProducts.data;
        ctx.res.statusCode = 200;
    });

    //======================================//
    //        DELETE PRODUCT ROUTER
    //======================================//

    router.get('/deleteProduct', verifyRequest(), async(ctx, res) =>{
        const { shop, accessToken } = ctx.session;
        const productID = ctx.query.id;
        const url = `https://${shop}/admin/api/2021-07/products/${productID}.json`;

        const shopifyHeader = (token) => ({
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token,
        });
        const getProducts = await axios.delete(url, { headers: shopifyHeader(accessToken) })
        .then(response => { console.log(response); })
        .catch(error => console.log(error));

        ctx.res.statusCode = 200;
    });

    //======================================//
    //        CREATE SCRIPT TAGS
    //======================================//
    router.get('/installScriptTags', verifyRequest(), async(ctx, res) =>{
        const { shop, accessToken } = ctx.session;
        
        const url = `https://${shop}/admin/api/2020-10/script_tags.json`;
        const src = 'https://example.com/example.js';

        let scriptTagExist = false;

        const shopifyHeader = (token) => ({
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token,
        });

        const scriptTagBody = JSON.stringify({
            script_tag: {
                event: 'onload',
                src, 
              },
        });
 
        const getScriptTags = await axios.get(url, { headers: shopifyHeader(accessToken) });

        //console.log(getScriptTags.data);
        
        getScriptTags.data.script_tags.map((script) => {
           // console.log(script);
            if (script.src == src){
                scriptTagExist = true;
            }
        });

        if (!scriptTagExist){
            await axios.post(url, scriptTagBody, { headers: shopifyHeader(accessToken) })
            .then(response => { console.log(response); })
            .catch(error => console.log(error));
        }       

        ctx.res.statusCode = 200;
    });


    //======================================//
    //        DELETE SCRIPT TAG ROUTER
    //======================================//

    router.get('/uninstallScriptTag', verifyRequest(), async(ctx, res) =>{
        const { shop, accessToken } = ctx.session;
        const scriptTagID = ctx.query.id;
        const url = `https://${shop}/admin/api/2020-10/script_tags/${scriptTagID}.json`;
        

        const shopifyHeader = (token) => ({
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token,
        });
        await axios.delete(url, { headers: shopifyHeader(accessToken) })
        .then(response => { console.log(response); })
        .catch(error => console.log(error));

        ctx.res.statusCode = 200;
    });


    server.use(router.routes());
    server.use(router.allowedMethods());



    server.use(async (ctx) => {
        await handle(ctx.req, ctx.res);
        ctx.respond = false;
        ctx.res.statusCode = 200;
        return;
    });

    server.listen(port, () => { 
        console.log(`> Ready on http://localhost:${port}`);
    });

});
