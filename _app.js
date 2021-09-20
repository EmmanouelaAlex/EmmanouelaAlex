import React from 'react';
import App from 'next/app';
import Head from 'next/head';
import { AppProvider } from '@shopify/polaris';
import translations from '@shopify/polaris/locales/en.json'; 
import '@shopify/polaris/dist/styles.css';
import ApolloClient from 'apollo-boost';
import { ApolloProvider } from 'react-apollo'; 

const client = new ApolloClient({
    uri: "/graphql",
    fetchOptions:{
        credentials: 'include'
    },
});

class MyApp extends App{
    render(){
        const { Component, pageProps } = this.props;

        return(
            <React.Fragment>
                <Head>
                    <title>Emma App</title>
                    <meta charSet="utf-8" />
                </Head>              
                <AppProvider i18n={translations}>                    
                    <ApolloProvider client={client}> 
                        <Component {...pageProps} />
                    </ApolloProvider>
                </AppProvider>
            </React.Fragment>
        );
    }
}

export default MyApp;
