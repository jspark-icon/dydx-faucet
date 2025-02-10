# dydx faucet

## prerequisites
node.js version 20

```shell
npm install
```

## build
```shell
npm run build
```

## configuration
environment variable `CONFIG` for config file path (default as `config.json`).
* Config example
```json
{
  "validatorClient": {
    "validatorUrl": "http://localhost:26657",
    "chainId": "localdydxprotocol",
    "denomConfig": {
      "USDC_DENOM": "ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5",
      "USDC_DECIMALS": 6,
      "USDC_GAS_DENOM": "uusdc",
      "CHAINTOKEN_DENOM": "adv4tnt",
      "CHAINTOKEN_DECIMALS": 18,
    },
    "defaultClientMemo": "faucet"
  },
  "faucetWallet": "merge panther lobster crazy road hollow amused security before critic about cliff exhibit cause coyote talent happy where lion river tobacco option coconut small",
  "faucetNativeTokenWallet": "color habit donor nurse dinosaur stable wonder process post perfect raven gold census inside worth inquiry mammal panic olive toss shadow strong name drum",
  "faucetNativeTokenAmount": 1
}
```
- `listenPort`: default as 9000
- `cert`: default as empty, `/path/to/server-cert-pem-file`
- `key`: default as empty, `/path/to/server-key-pem-file`
- `staticWebPath`: default as "public"
- `accessLogFile`: if not set, access log to stdout
- `frontPathRegExp`: optional
- `validatorClient`: default as above example 
  - `validatorUrl`: required
  - `chainId`: required
  - `denomConfig`: optional, refer 'https://github.com/dydxprotocol/v4-clients/blob/main/v4-client-js/src/clients/types.ts#L75'  
                   default as `{
    USDC_DENOM: 'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5',
    USDC_DECIMALS: 6,
    USDC_GAS_DENOM: 'uusdc',
    CHAINTOKEN_DENOM: 'adv4tnt',
    CHAINTOKEN_DECIMALS: 18,
    }`
  - `broadcastOptions`: optional, refer 'https://github.com/dydxprotocol/v4-clients/blob/main/v4-client-js/src/clients/types.ts#L70'
  - `defaultClientMemo`: default as "faucet"
  - `useTimestampNonce`: optional
- `faucetWallet`: mnemonic for USDC holder wallet, default as `merge panther lobster crazy road hollow amused security before critic about cliff exhibit cause coyote talent happy where lion river tobacco option coconut small`
- `faucetNativeTokenWallet`: mnemonic for NativeToken holder wallet, default as `color habit donor nurse dinosaur stable wonder process post perfect raven gold census inside worth inquiry mammal panic olive toss shadow strong name drum`
- `faucetNativeTokenAmount`: amount of NativeToken faucet 

## run
### development
`CONFIG=/path/to/config-file npm run dev`
### production
`CONFIG=/path/to/config-file npm run prod`

## API

### Faucet tokens
POST `/faucet/tokens`
* Request example
```json
{
  "address": "dydx14zzueazeh0hj67cghhf9jypslcf9sh2n5k6art",
  "subaccountNumber": 0,
  "amount": 100
}
```

* references
  - https://github.com/dydxprotocol/v4-web/blob/main/src/hooks/useSubaccount.tsx#L457
  - https://github.com/dydxprotocol/v4-clients/blob/main/v4-client-js/src/clients/faucet-client.ts#L10


### Faucet native token
POST `/faucet/native-token`
* Request example
```json
{
  "address": "dydx14zzueazeh0hj67cghhf9jypslcf9sh2n5k6art"
}
```

* references
    - https://github.com/dydxprotocol/v4-web/blob/main/src/hooks/useSubaccount.tsx#L457
    - https://github.com/dydxprotocol/v4-clients/blob/main/v4-client-js/src/clients/faucet-client.ts#L36
