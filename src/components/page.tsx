import { Grid, Icon, InputAdornment, TextField } from "@mui/material"
import { useTheme } from "@mui/styles"
import { utils } from "near-api-js"
import * as React from "react"
import { ReactNode, useReducer } from "react"
import {
    getMetapoolInfo,
    getNewFarmingStake,
    getNewPoolInfo,
    getOldFarmingStake,
    getOldPoolInfo,
    getWnearBalanceOnRef,
    removeLiquidity,
    stake,
    unstake,
    wnearToStnear
} from "../services/near"
import { Refresh } from "../utils/refresh"
import NavButtonComponent from "./navbuttons"
import StepComponent from "./step"
import TitleComponent from "./title"

const inputValues: string[] = []
const inputValuesUnmatched: string[] = []
const inputErrors: boolean[] = []

const setInputValues = (
    id: number,
    val: string,
    pattern?: string,
    fallback: string = "0"
) => {
    inputValuesUnmatched[id] = val
    inputValues[id] =
        pattern !== undefined
            ? val.match(pattern) !== null
                ? val
                : fallback
            : val
}

const setInputErrors = (
    id: number,
    pattern?: string,
    assert?: Array<{ test: (value: string) => boolean; msg: string }>
) =>
    (inputErrors[id] =
        (pattern !== undefined &&
            inputValuesUnmatched[id].match(pattern) === null) ||
        (assert !== undefined &&
            assert.some(a => a.test(inputValuesUnmatched[id]))))

const Description = (props: { children: any }) => (
    <div
        style={{
            display: "flex",
            flexFlow: "row wrap",
            alignItems: "baseline",
            whiteSpace: "break-spaces"
        }}
    >
        {props.children}
    </div>
)

const Break = () => <div style={{ width: "100%" }} />

const Purple = (props: { children: any }) => {
    const theme = useTheme() as any
    return (
        <span
            style={{
                color: theme.palette.primary.main,
                fontWeight: "bold"
            }}
        >
            {props.children}
        </span>
    )
}

const Input = (props: {
    id: number
    label: string
    unit?: string
    type?: string
    default: string
    pattern?: string
    assert?: Array<{ test: (value: string) => boolean; msg: string }>
}) => {
    setInputValues(props.id, props.default)
    setInputErrors(props.id, props.pattern, props.assert)
    return (
        <TextField
            sx={{
                mx: 1,
                flex: 2,
                flexBasis: 0
            }}
            label={props.label}
            variant="outlined"
            margin="normal"
            size="small"
            type={props.type}
            InputProps={{
                ...(props.unit === undefined
                    ? {}
                    : {
                          endAdornment: (
                              <InputAdornment position="end">
                                  {props.unit}
                              </InputAdornment>
                          )
                      }),
                ...(props.pattern === undefined
                    ? {}
                    : {
                          pattern: props.pattern
                      })
            }}
            defaultValue={props.default}
            error={inputErrors[props.id]}
            helperText={
                inputErrors[props.id] &&
                props.pattern !== undefined &&
                inputValuesUnmatched[props.id].match(props.pattern) === null
                    ? "Invalid input value"
                    : props.assert !== undefined &&
                      props.assert.some(a =>
                          a.test(inputValuesUnmatched[props.id])
                      )
                    ? props
                          .assert!.filter(a =>
                              a.test(inputValuesUnmatched[props.id])
                          )
                          .map(a => a.msg)
                          .reduce((a, b) => a + "\n" + b)
                    : ""
            }
            onChange={e => {
                setInputValues(props.id, e.target.value, props.pattern)
                setInputErrors(props.id, props.pattern, props.assert)
                updatePage()
            }}
        />
    )
}

function getContent(page: number): ReactNode | null {
    switch (page) {
        case 0:
            return (
                <>
                    <TitleComponent title="Exit OCT <-> wNEAR" />
                    <StepComponent
                        title="1. Unstake from OCT <-> wNEAR farm"
                        description={
                            <Description>
                                You have {""}
                                <Purple>
                                    {window.oldFarmingStake
                                        ? parseFloat(
                                              utils.format.formatNearAmount(
                                                  window.oldFarmingStake
                                              )!
                                          ).toFixed(3)
                                        : "..."}
                                </Purple>
                                {""} staked shares.
                            </Description>
                        }
                        completed={
                            window.REFRESHER[0] ??
                            (() => {
                                window.REFRESHER[0] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            getOldFarmingStake()
                                                .then(
                                                    res =>
                                                        (window.oldFarmingStake =
                                                            res)
                                                )
                                                .then(res =>
                                                    resolve(
                                                        BigInt(res) ===
                                                            BigInt("0")
                                                    )
                                                )
                                        ),
                                    0
                                )
                                return window.REFRESHER[0]
                            })()
                        }
                        action={() => unstake(window.oldFarmingStake)}
                    />
                    <StepComponent
                        title="2. Remove liquidity from OCT <-> wNEAR pool"
                        description={
                            <Description>
                                You have {""}
                                <Purple>
                                    {window.oldPoolInfo
                                        ? parseFloat(
                                              utils.format.formatNearAmount(
                                                  window.oldPoolInfo.user_shares
                                              )!
                                          ).toFixed(3)
                                        : "..."}
                                </Purple>
                                {""} LP shares equal to {""}
                                <span>
                                    <Purple>
                                        {window.oldPoolInfo
                                            ? parseFloat(
                                                  utils.format.formatNearAmount(
                                                      window.oldPoolInfo
                                                          .min_amounts[0] +
                                                          "000000" // cheap way to divide by 1e6
                                                  )!
                                              ).toFixed(3)
                                            : "..."}
                                    </Purple>
                                    {""} $OCT and {""}
                                </span>
                                <span>
                                    <Purple>
                                        {window.oldPoolInfo
                                            ? parseFloat(
                                                  utils.format.formatNearAmount(
                                                      window.oldPoolInfo
                                                          .min_amounts[1]
                                                  )!
                                              ).toFixed(3)
                                            : "..."}
                                    </Purple>
                                    {""} $wNEAR.
                                </span>
                            </Description>
                        }
                        completed={
                            window.REFRESHER[1] ??
                            (() => {
                                window.REFRESHER[1] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            getOldPoolInfo().then(res => {
                                                window.oldPoolInfo = res
                                                resolve(
                                                    BigInt(res.user_shares) ===
                                                        BigInt("0")
                                                )
                                            })
                                        )
                                )
                                return window.REFRESHER[1]
                            })()
                        }
                        action={() => {
                            localStorage.setItem(
                                "OCTminAmountOut",
                                window.oldPoolInfo.min_amounts[0]
                            )
                            localStorage.setItem(
                                "wNEARminAmountOut",
                                window.oldPoolInfo.min_amounts[1]
                            )
                            removeLiquidity(
                                window.oldPoolInfo.user_shares,
                                window.oldPoolInfo.total_shares,
                                window.oldPoolInfo.min_amounts
                            )
                        }}
                    />
                    <NavButtonComponent next />
                </>
            )

        case 1:
            return (
                <>
                    <TitleComponent title="wNEAR -> stNEAR" />
                    <StepComponent
                        title={"Withdraw, unwrap & stake"}
                        description={
                            <Description>
                                Withdraw your wNEAR from Ref-finance, unwrap it,
                                and stake it with MetaPool to get stNEAR.
                                <Break />
                                You currently have {""}
                                <span>
                                    <Purple>
                                        {window.wNEARBalanceOnRef
                                            ? parseFloat(
                                                  utils.format
                                                      .formatNearAmount(
                                                          window.wNEARBalanceOnRef
                                                      )
                                                      .toString()
                                              ).toFixed(3)
                                            : "..."}
                                    </Purple>
                                    {""} $wNEAR on Ref-finance.
                                </span>
                                <Break />
                                <Input
                                    id={0}
                                    label="amount"
                                    unit="wNEAR"
                                    type="number"
                                    pattern="^\d+(\.\d{0,24})?$"
                                    assert={[
                                        {
                                            test: (value: string) =>
                                                window.minDepositAmount !==
                                                    undefined &&
                                                BigInt(
                                                    utils.format.parseNearAmount(
                                                        value
                                                    ) ?? "0"
                                                ) <
                                                    BigInt(
                                                        window.minDepositAmount
                                                    ),
                                            msg: `Staking with MetaPool requires a minimum deposit of ${parseFloat(
                                                utils.format.formatNearAmount(
                                                    window.minDepositAmount
                                                )
                                            ).toFixed(3)} $wNEAR.`
                                        },
                                        {
                                            test: (value: string) =>
                                                window.wNEARBalanceOnRef !==
                                                    undefined &&
                                                BigInt(
                                                    utils.format.parseNearAmount(
                                                        value
                                                    ) ?? "0"
                                                ) >
                                                    BigInt(
                                                        window.wNEARBalanceOnRef
                                                    ),
                                            msg: `Insufficient funds. You only have ${parseFloat(
                                                utils.format.formatNearAmount(
                                                    window.wNEARBalanceOnRef
                                                )
                                            ).toFixed(3)} $wNEAR on Ref-finance.`
                                        }
                                    ]}
                                    default={
                                        inputValuesUnmatched[0] ??
                                        utils.format.formatNearAmount(
                                            localStorage.getItem(
                                                "wNEARminAmountOut"
                                            ) ?? "0"
                                        )
                                    }
                                />
                                {""} {"\u2248"} {""}
                                <span>
                                    <Purple>
                                        {window.stNEARPrice
                                            ? parseFloat(
                                                  (
                                                      Number(
                                                          BigInt(
                                                              (utils.format.parseNearAmount(
                                                                  inputValues[0]
                                                              ) as string) +
                                                                  "0000"
                                                          ) /
                                                              BigInt(
                                                                  window.stNEARPrice
                                                              )
                                                      ) / 10000
                                                  ).toString()
                                              ).toFixed(3)
                                            : "..."}
                                    </Purple>
                                    {""} $stNEAR.
                                </span>
                                <Break />
                            </Description>
                        }
                        completed={
                            window.REFRESHER[2] ??
                            (() => {
                                window.REFRESHER[2] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            getWnearBalanceOnRef().then(
                                                async res => {
                                                    const {
                                                        st_near_price,
                                                        min_deposit_amount
                                                    } = await getMetapoolInfo()
                                                    window.stNEARPrice =
                                                        st_near_price
                                                    window.minDepositAmount =
                                                        min_deposit_amount
                                                    window.wNEARBalanceOnRef =
                                                        res
                                                    resolve(
                                                        BigInt(res) <
                                                            BigInt(
                                                                min_deposit_amount
                                                            )
                                                    )
                                                }
                                            )
                                        ),
                                    0
                                )
                                return window.REFRESHER[2]
                            })()
                        }
                        denied={inputErrors[0]}
                        action={() =>
                            wnearToStnear(
                                utils.format.parseNearAmount(
                                    inputValues[0]
                                ) as string
                            )
                        }
                    />
                    <NavButtonComponent next back />
                </>
            )

        case 2:
            return (
                <>
                    <TitleComponent title="reDeposit Funds" />
                    <StepComponent
                        title="1. Add liquidity to pool"
                        description={
                            <Description>
                                <Input
                                    id={1}
                                    label="amount"
                                    unit="OCT"
                                    type="number"
                                    pattern="^\d+(\.\d{0,18})?$"
                                    assert={[
                                        {
                                            test: (value: string) =>
                                                window.OCTBalanceOnRef !==
                                                    undefined &&
                                                BigInt(
                                                    utils.format.parseNearAmount(
                                                        value
                                                    ) ?? "0"
                                                ) >
                                                    BigInt(
                                                        window.OCTBalanceOnRef
                                                    ),
                                            msg: `Insufficient funds. You only have ${parseFloat(
                                                utils.format.formatNearAmount(
                                                    window.OCTBalanceOnRef
                                                )
                                            ).toFixed(3)} $OCT on Ref-finance.`
                                        }
                                    ]}
                                    default={
                                        inputValuesUnmatched[1] ??
                                        utils.format.formatNearAmount(
                                            localStorage.getItem(
                                                "OCTminAmountOut"
                                            ) ?? "0"
                                        )
                                    }
                                />
                                <Icon sx={{ alignSelf: "center" }}>link</Icon>
                                <Input
                                    id={2}
                                    label="amount"
                                    unit="stNEAR"
                                    type="number"
                                    pattern="^\d+(\.\d{0,24})?$"
                                    assert={[
                                        {
                                            test: (value: string) =>
                                                window.stNEARBalanceOnRef !==
                                                    undefined &&
                                                window.stNEARBalance !==
                                                    undefined &&
                                                BigInt(
                                                    utils.format.parseNearAmount(
                                                        value
                                                    ) ?? "0"
                                                ) > (
                                                    BigInt(
                                                        window.stNEARBalanceOnRef
                                                    ) + BigInt(
                                                        window.stNEARBalance
                                                    )
                                                ),
                                            msg: `Insufficient funds. You only have ${parseFloat(
                                                utils.format.formatNearAmount(
                                                    (BigInt(
                                                        window.stNEARBalanceOnRef ?? "0"
                                                    ) + BigInt(
                                                        window.stNEARBalance ?? "0"
                                                    )).toString()
                                                )
                                            ).toFixed(3)} stNEAR in total.`
                                        }
                                    ]}
                                    default={
                                        inputValuesUnmatched[2] ?? "0"
                                    }
                                />
                            </Description>
                        }
                        completed={
                            window.REFRESHER[3] ??
                            (() => {
                                window.REFRESHER[3] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            getNewPoolInfo().then(res => {
                                                window.newPoolInfo = res
                                                resolve(
                                                    BigInt(res.user_shares) <=
                                                        BigInt("1") // leave 1 LP share to occupy storage
                                                )
                                            })
                                        )
                                )
                                return window.REFRESHER[3]
                            })()
                        }
                        // action={}
                    />
                    <StepComponent
                        title="2. Add liquidity to farm"
                        description={
                            <Description>
                                You have {""}
                                <span>
                                    <Purple>
                                        {window.newPoolInfo
                                            ? parseFloat(
                                                  utils.format
                                                      .formatNearAmount(
                                                          window.newPoolInfo
                                                              .user_shares
                                                      )
                                                      .toString()
                                              ).toFixed(3)
                                            : "..."}
                                    </Purple>
                                    {""} LP tokens {""}
                                </span>
                                in the OCT {"<->"} stNEAR pool.
                                <Break />
                                Supply them to the OCT {"<->"} stNEAR farm to
                                start farming.
                                <Break />
                                You currently have {""}
                                <span>
                                    <Purple>
                                        {window.newFarmingStake
                                            ? parseFloat(
                                                  utils.format
                                                      .formatNearAmount(
                                                          window.newFarmingStake
                                                      )
                                                      .toString()
                                              ).toFixed(3)
                                            : "..."}
                                    </Purple>
                                    {""} LP tokens in the farm.
                                </span>
                            </Description>
                        }
                        completed={
                            window.REFRESHER[4] ??
                            (() => {
                                window.REFRESHER[4] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            getNewFarmingStake().then(
                                                async res => {
                                                    window.newFarmingStake = res
                                                    const newPoolInfo =
                                                        await getNewPoolInfo()
                                                    resolve(
                                                        BigInt(res) ===
                                                            BigInt(0) &&
                                                            BigInt(
                                                                newPoolInfo.user_shares
                                                            ) <= BigInt(1)
                                                    )
                                                }
                                            )
                                        ),
                                    0
                                )
                                return window.REFRESHER[4]
                            })()
                        }
                        action={() =>
                            stake(
                                (
                                    BigInt(window.newPoolInfo.user_shares) -
                                    BigInt("1")
                                ) // leave 1 LP share to occupy storage
                                    .toString()
                            )
                        }
                    />
                    <NavButtonComponent next back />
                </>
            )

        case 3:
            return (
                <>
                    <TitleComponent title="DONE!1!1111!!" />
                </>
            )

        default:
            return (
                <StepComponent
                    title="Something went wrong"
                    description="Try to clear site data"
                    completed={
                        window.REFRESHER[5] ??
                        (() => {
                            window.REFRESHER[5] = new Refresh(
                                () =>
                                    new Promise(resolve =>
                                        setTimeout(() => resolve(false), 10)
                                    )
                            )
                            return window.REFRESHER[5]
                        })()
                    }
                    // action={}
                />
            )
    }
}

let updatePage: any

export default function PageComponent(props: { page: number }) {
    const [, forceUpdate] = useReducer(x => x + 1, 0)
    updatePage = forceUpdate
    return (
        <Grid
            container
            sx={{
                width: 1,
                height: 1,
                p: 4
            }}
            direction="column"
            justifyContent="space-evenly"
            alignItems="center"
            wrap="nowrap"
        >
            {getContent(props.page)}
        </Grid>
    )
}
