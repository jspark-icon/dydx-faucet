import express, {NextFunction, Request, Response} from "express";
import asyncHandler from "express-async-handler";
import fs from "fs";
import cors from "cors";
import {STATUS_CODES} from "http";
import {StatusCodes} from "http-status-codes";
import https from "https";
import morgan from "morgan";
import path from "path";
import {createStream} from "rotating-file-stream";
import {
    BECH32_PREFIX,
    BroadcastOptions,
    DenomConfig,
    LocalWallet,
    SubaccountInfo,
    ValidatorClient,
    ValidatorConfig
} from "@dydxprotocol/v4-client-js";
import {Method} from "@cosmjs/tendermint-rpc";
import Long from "long";
import {MsgDepositToSubaccount, SubaccountId} from "@dydxprotocol/v4-client-js/src/clients/modules/proto-includes";

export const TYPE_URL_MSG_DEPOSIT_TO_SUBACCOUNT = '/dydxprotocol.sending.MsgDepositToSubaccount';

interface ValidatorClientConfig {
    validatorUrl: string
    chainId: string
    denomConfig?: DenomConfig
    broadcastOptions?: BroadcastOptions
    defaultClientMemo?: string
    useTimestampNonce?: boolean
}

interface Config {
    listenPort?: number
    cert?: string
    key?: string
    staticWebPath?: string
    accessLogFile?: string
    frontPathRegExp?: string
    validatorClient: ValidatorClientConfig
    faucetWallet?: string
    faucetNativeTokenWallet?: string
    faucetNativeTokenAmount?: number
}

const defaultConfig = {
    listenPort: 9000,
    staticWebPath: 'public',
    validatorClient: {
        validatorUrl: "http://localhost:26657",
        chainId: "localdydxprotocol",
        denomConfig: {
            USDC_DENOM: 'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5',
            USDC_DECIMALS: 6,
            USDC_GAS_DENOM: 'uusdc',
            CHAINTOKEN_DENOM: 'adv4tnt',
            CHAINTOKEN_DECIMALS: 18,
        },
        defaultClientMemo: 'faucet'
    },
    faucetWallet: "merge panther lobster crazy road hollow amused security before critic about cliff exhibit cause coyote talent happy where lion river tobacco option coconut small",
    faucetNativeTokenWallet: "color habit donor nurse dinosaur stable wonder process post perfect raven gold census inside worth inquiry mammal panic olive toss shadow strong name drum",
    faucetNativeTokenAmount: 1
}

function loadConfig(): Config {
    const configFilePath = process.env.CONFIG || 'config.json';
    console.log(`try read config file: ${configFilePath}`);
    if (!fs.existsSync(configFilePath)) {
        console.log(`not found config file: ${configFilePath}`);
        console.log(`use default config: ${JSON.stringify(defaultConfig)}`);
        return defaultConfig;
    }
    const configJson = fs.readFileSync(configFilePath, 'utf-8');
    console.log(`config: ${configJson}`);
    const config = JSON.parse(configJson) as Config;
    if (!(config.listenPort)) {
        console.log(`listenPort uses default value:${defaultConfig.listenPort}`);
        config.listenPort = defaultConfig.listenPort;
    }
    if (!(config.staticWebPath)) {
        console.log(`staticWebPath uses default value:${defaultConfig.staticWebPath}`);
        config.staticWebPath = defaultConfig.staticWebPath;
    }
    if (config.cert) {
        console.log(`try read server cert file: ${config.cert}`);
        config.cert = fs.readFileSync(config.cert, 'utf-8');
    }
    if (config.key) {
        console.log(`try read server key file: ${config.key}`);
        config.key = fs.readFileSync(config.key, 'utf-8');
    }
    if (!(config.validatorClient)) {
        console.log(`validatorClient uses default value:${JSON.stringify(defaultConfig.validatorClient)}`);
        config.validatorClient = defaultConfig.validatorClient;
    } else {
        if (!(config.validatorClient.validatorUrl)) {
            console.log(`validatorClient.validatorUrl uses default value:${defaultConfig.validatorClient.validatorUrl}`);
            config.validatorClient.validatorUrl = defaultConfig.validatorClient.validatorUrl;
        }
        if (!(config.validatorClient.chainId)) {
            console.log(`validatorClient.chainId uses default value:${defaultConfig.validatorClient.chainId}`);
            config.validatorClient.chainId = defaultConfig.validatorClient.chainId;
        }
        if (!(config.validatorClient.denomConfig)) {
            console.log(`validatorClient.denomConfig uses default value:${defaultConfig.validatorClient.denomConfig}`);
            config.validatorClient.denomConfig = defaultConfig.validatorClient.denomConfig;
        }
        if (!(config.validatorClient.defaultClientMemo)) {
            console.log(`validatorClient.defaultClientMemo uses default value:${defaultConfig.validatorClient.defaultClientMemo}`);
            config.validatorClient.defaultClientMemo = defaultConfig.validatorClient.defaultClientMemo;
        }
    }
    if (!(config.faucetWallet)) {
        console.log(`faucetWallet uses default value:${defaultConfig.faucetWallet}`);
        config.faucetWallet = defaultConfig.faucetWallet;
    }
    if (!(config.faucetNativeTokenWallet)) {
        console.log(`faucetNativeTokenWallet uses default value:${defaultConfig.faucetNativeTokenWallet}`);
        config.faucetNativeTokenWallet = defaultConfig.faucetNativeTokenWallet;
    }
    if (!(config.faucetNativeTokenAmount)) {
        console.log(`faucetNativeTokenAmount uses default value:${defaultConfig.faucetNativeTokenAmount}`);
        config.faucetNativeTokenAmount = defaultConfig.faucetNativeTokenAmount;
    }
    return config;
}

function getLogStream(logFile: string) {
    const parsedPath = logFile ? path.parse(logFile) : undefined;
    return parsedPath ? createStream(parsedPath.base, {
        interval: '1d',
        path: parsedPath.dir
    }) : process.stdout;
}

const config = loadConfig();
let validatorClient;
let faucetWallet;
let faucetNativeTokenWallet;
Promise.resolve(ensureClient()).then(r => console.log("initialized"));
async function ensureClient() {
    if (!validatorClient) {
        validatorClient = await ValidatorClient.connect(
            new ValidatorConfig(
                config.validatorClient.validatorUrl,
                config.validatorClient.chainId,
                config.validatorClient.denomConfig,
                config.validatorClient.broadcastOptions,
                config.validatorClient.defaultClientMemo,
                config.validatorClient.useTimestampNonce
            )
        );
    }
    if (!faucetWallet) {
        faucetWallet = await LocalWallet.fromMnemonic(config.faucetWallet, BECH32_PREFIX);
    }
    if (!faucetNativeTokenWallet) {
        faucetNativeTokenWallet = await LocalWallet.fromMnemonic(defaultConfig.faucetNativeTokenWallet, BECH32_PREFIX);
    }
}

const app = express();
app.use(cors());
app.use(express.static(config.staticWebPath));
app.use(express.json());

//TODO access log
morgan.token('path', (req: Request) => {
    return req.path
});
morgan.token('query', (req: Request) => {
    return req.url.substring(req.path.length)
});
morgan.token('body', (req: Request) => {
    return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
});

const accessLogFormat = '{"logger":"access","timestamp":":date[iso]","method":":method","path":":path","status"::status,"query":":query","responseTimeMs"::response-time,"body":":body"}';
const accessLogStream = getLogStream(config.accessLogFile);
app.use(morgan(accessLogFormat, {
    stream: accessLogStream
}));
app.set('trust proxy', 'uniquelocal');

app.get('/config', asyncHandler(async (req: Request, res: Response) => {
    res.json(config);
}));

interface FaucetTokensRequest {
    address: string
    subaccountNumber: number
    amount: number
}

const usdcDecimal = Math.pow(10, config.validatorClient.denomConfig.USDC_DECIMALS);
app.post('/faucet/tokens', asyncHandler(async (req: Request, res: Response) => {
    await ensureClient();
    const body = req.body as FaucetTokensRequest;
    const amount = body.amount * usdcDecimal;
    const subaccount = new SubaccountInfo(faucetWallet, 0);
    // const transferTx = await validatorClient.post.sendToken(
    //     subaccount,
    //     body.address,
    //     config.validatorClient.denomConfig.USDC_DENOM,
    //     amount.toString(),
    //     false,
    //     Method.BroadcastTxCommit);
    // console.log(`transferTx{hash:${transferTx.hash} code:${transferTx.code}}`);

    const recipient: SubaccountId = {
        owner: body.address,
        number: 0,
    };
    const msg: MsgDepositToSubaccount = {
        sender: subaccount.address,
        recipient,
        assetId: 0,
        quantums: Long.fromNumber(amount),
    };
    const depositMsg = {
        typeUrl : TYPE_URL_MSG_DEPOSIT_TO_SUBACCOUNT,
        value: msg
    }
    const depositTx = await validatorClient.post.send(
        subaccount.wallet,
        () => Promise.resolve([depositMsg]),
        false,
        undefined,
        undefined,
        Method.BroadcastTxCommit);
    console.log(`depositTx{hash:${depositTx.hash} code:${depositTx.code}}`);
    res.json({result: "ok"});
}));

interface FaucetNativeTokenRequest {
    address: string
}

const nativeTokenDecimal = "0".repeat(config.validatorClient.denomConfig.CHAINTOKEN_DECIMALS);
app.post('/faucet/native-token', asyncHandler(async (req: Request, res: Response) => {
    await ensureClient();
    const body = req.body as FaucetNativeTokenRequest;
    const subaccount = new SubaccountInfo(faucetNativeTokenWallet, 0);
    const tx = await validatorClient.post.sendToken(
        subaccount,
        body.address,
        config.validatorClient.denomConfig.CHAINTOKEN_DENOM,
        config.faucetNativeTokenAmount+nativeTokenDecimal,
        false,
        Method.BroadcastTxCommit);
    console.log(`tx{hash:${tx.hash} code:${tx.code}}`);
    res.json({result: "ok"});
}));

class RestError extends Error {
    req: Request;
    code: number;

    constructor(req: Request, code: number, cause?: Error) {
        super(`${cause ? cause.message : STATUS_CODES[code]}`, {cause: cause});
        this.name = this.constructor.name;
        this.req = req;
        this.code = code;
    }
}

// this default handler registration should be placed last for NotFound handling
const indexFile = path.join(config.staticWebPath, '/index.html');
const frontPathRegExp = new RegExp(config.frontPathRegExp || '');
app.use((req: Request, res: Response, next: NextFunction) => {
    if (fs.existsSync(indexFile)) {
        if (!frontPathRegExp.test(req.path)) {
            throw new RestError(req, StatusCodes.NOT_FOUND);
        }
        res.sendFile(indexFile);
    } else {
        throw new RestError(req, StatusCodes.NOT_FOUND);
    }
});
// this default error handler registration should be placed last
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }
    const restErr: RestError = err instanceof RestError ? err as RestError : new RestError(req, StatusCodes.INTERNAL_SERVER_ERROR, err);
    res.status(restErr.code).json({error: err.message});
});

function onListen() {
    console.log(`${config.cert ? 'https' : 'http'} server port:${config.listenPort} staticWebPath:${config.staticWebPath}`)
}

if (config.cert) {
    https.createServer({
        cert: config.cert,
        key: config.key
    }, app).listen(config.listenPort, onListen);
} else {
    app.listen(config.listenPort, () => {
        console.log(`server port:${config.listenPort} staticWebPath:${config.staticWebPath}`)
    });
}
