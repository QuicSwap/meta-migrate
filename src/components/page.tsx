import {
    Box,
    Grid,
    Icon,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField
} from "@mui/material"
import { useTheme } from "@mui/styles"
import { utils } from "near-api-js"
import * as React from "react"
import { ReactNode, useReducer } from "react"
import {
    addLiquidity,
    getMetapoolInfo,
    getNewFarmingStake,
    getNewPoolInfo,
    getOctBalanceOnRef,
    getStnearBalance,
    getStnearBalanceOnRef,
    getWnearBalanceOnRef,
    getOldPosition,
    exitOldPosition,
    stake,
    wnearToStnear,
    OLD_POOL_ID,
    NEW_POOL_ID
} from "../services/near"
import { Refresh } from "../utils/refresh"
import NavButtonComponent from "./navbuttons"
import StepComponent from "./step"
import TitleComponent from "./title"
import meme from "../meme.png"

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

const Warning = (props: { children: any }) => {
    const theme = useTheme() as any
    return (
        <span
            style={{
                display: "flex",
                flexFlow: "row wrap",
                color: theme.palette.warning.main,
                fontWeight: "bold",
                marginTop: "8px"
            }}
        >
            <Icon>warning_amber</Icon> {props.children}
        </span>
    )
}

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
    onChange?: (value: string) => void
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
            value={inputValuesUnmatched[props.id]}
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
                props?.onChange?.(e.target.value)
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
                        title={"Unstake & remove liquidity."}
                        description={
                            <Description>
                                Unstake your LP shares from the OCT {"<->"}{" "}
                                wNEAR farm and remove liquidity from the OCT{" "}
                                {"<->"} wNEAR pool to receive OCT and wNEAR
                                tokens.
                                <Break />
                                You have a total of {""}
                                <span>
                                    <Purple>
                                        {window.oldPosition
                                            ? parseFloat(
                                                  utils.format.formatNearAmount(
                                                      window.oldPosition
                                                          .user_total_shares
                                                  )!
                                              ).toFixed(3)
                                            : "..."}
                                    </Purple>
                                    {""} LP shares
                                </span>
                                <Break />
                                {"\u2248"} {""}
                                <span>
                                    <Purple>
                                        {window.oldPosition
                                            ? parseFloat(
                                                  utils.format.formatNearAmount(
                                                      window.oldPosition
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
                                        {window.oldPosition
                                            ? parseFloat(
                                                  utils.format.formatNearAmount(
                                                      window.oldPosition
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
                                            getOldPosition().then(res => {
                                                window.oldPosition = res
                                                resolve(
                                                    BigInt(
                                                        res.user_lp_shares
                                                    ) === BigInt("0") &&
                                                        BigInt(
                                                            res.user_farm_shares
                                                        ) === BigInt("0")
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
                                window.oldPosition.min_amounts[0]
                            )
                            localStorage.setItem(
                                "wNEARminAmountOut",
                                window.oldPosition.min_amounts[1]
                            )
                            exitOldPosition(
                                window.oldPosition.user_farm_shares,
                                window.oldPosition.user_total_shares,
                                window.oldPosition.min_amounts
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
                        title={"Withdraw, unwrap & stake."}
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
                                            ).toFixed(
                                                3
                                            )} $wNEAR on Ref-finance.`
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
                    <TitleComponent title="Enter OCT <-> stNEAR" />
                    <StepComponent
                        title="1. Add liquidity to the OCT <-> stNEAR pool."
                        description={
                            <Description>
                                <Break />
                                You have {""}
                                <span>
                                    <Purple>
                                        {window.OCTBalanceOnRef !== undefined
                                            ? parseFloat(
                                                  utils.format.formatNearAmount(
                                                      window.OCTBalanceOnRef +
                                                          "000000"
                                                  )
                                              ).toFixed(3)
                                            : "..."}
                                    </Purple>
                                    {""} $OCT
                                </span>
                                {""} and {""}
                                <span>
                                    <Purple>
                                        {window.stNEARBalance !== undefined &&
                                        window.stNEARBalanceOnRef !== undefined
                                            ? parseFloat(
                                                  utils.format.formatNearAmount(
                                                      (
                                                          BigInt(
                                                              window.stNEARBalance
                                                          ) +
                                                          BigInt(
                                                              window.stNEARBalanceOnRef
                                                          )
                                                      ).toString()
                                                  )
                                              ).toFixed(3)
                                            : "..."}
                                    </Purple>
                                    {""} $stNEAR.
                                </span>
                                <Break />
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
                                                        window.OCTBalanceOnRef +
                                                            "000000"
                                                    ),
                                            msg: `Insufficient funds. You only have ${
                                                window.OCTBalanceOnRef !==
                                                undefined
                                                    ? parseFloat(
                                                          utils.format.formatNearAmount(
                                                              window.OCTBalanceOnRef +
                                                                  "000000"
                                                          )
                                                      ).toFixed(3)
                                                    : "..."
                                            } $OCT on Ref-finance.`
                                        }
                                    ]}
                                    onChange={(value: string) => {
                                        if (
                                            window.newPoolInfo !== undefined &&
                                            !inputErrors[1]
                                        ) {
                                            // https://stackoverflow.com/a/54409977/17894968
                                            inputValuesUnmatched[2] = (
                                                parseFloat(value) /
                                                (Number(
                                                    (BigInt("10000000000") *
                                                        BigInt("1000000") *
                                                        BigInt(
                                                            window.newPoolInfo
                                                                .amounts[1]
                                                        )) /
                                                        BigInt(
                                                            window.newPoolInfo
                                                                .amounts[0]
                                                        )
                                                ) /
                                                    10000000000)
                                            ).toString() // TODO: check if final pool is [OCT, stNEAR] or [stNEAR, OCT]
                                        }
                                    }}
                                    default={
                                        inputValuesUnmatched[1] ??
                                        utils.format.formatNearAmount(
                                            (localStorage.getItem(
                                                "OCTminAmountOut"
                                            ) ?? "0") + "000000"
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
                                                ) >
                                                    BigInt(
                                                        window.stNEARBalanceOnRef
                                                    ) +
                                                        BigInt(
                                                            window.stNEARBalance
                                                        ),
                                            msg: `Insufficient funds. You only have ${parseFloat(
                                                utils.format.formatNearAmount(
                                                    (
                                                        BigInt(
                                                            window.stNEARBalanceOnRef ??
                                                                "0"
                                                        ) +
                                                        BigInt(
                                                            window.stNEARBalance ??
                                                                "0"
                                                        )
                                                    ).toString()
                                                )
                                            ).toFixed(3)} stNEAR in total.`
                                        }
                                    ]}
                                    onChange={(value: string) => {
                                        if (
                                            window.newPoolInfo !== undefined &&
                                            !inputErrors[2]
                                        ) {
                                            inputValuesUnmatched[1] = (
                                                (parseFloat(value) *
                                                    Number(
                                                        (BigInt("10000000000") *
                                                            BigInt("1000000") *
                                                            BigInt(
                                                                window
                                                                    .newPoolInfo
                                                                    .amounts[1]
                                                            )) /
                                                            BigInt(
                                                                window
                                                                    .newPoolInfo
                                                                    .amounts[0]
                                                            )
                                                    )) /
                                                10000000000
                                            ).toString() // TODO: check if final pool is [OCT, stNEAR] or [stNEAR, OCT]
                                        }
                                    }}
                                    default={
                                        inputValuesUnmatched[2] ??
                                        (window.newPoolInfo !== undefined
                                            ? "0"
                                            : (() => {
                                                  window.nearInitPromise.then(
                                                      async () => {
                                                          window.newPoolInfo =
                                                              await getNewPoolInfo()
                                                          inputValuesUnmatched[2] =
                                                              (
                                                                  parseFloat(
                                                                      utils.format.formatNearAmount(
                                                                          localStorage.getItem(
                                                                              "OCTminAmountOut"
                                                                          ) +
                                                                              "000000" ??
                                                                              "0"
                                                                      )
                                                                  ) /
                                                                  (Number(
                                                                      (BigInt(
                                                                          "10000000000"
                                                                      ) *
                                                                          BigInt(
                                                                              "1000000"
                                                                          ) *
                                                                          BigInt(
                                                                              window
                                                                                  .newPoolInfo
                                                                                  .amounts[1]
                                                                          )) /
                                                                          BigInt(
                                                                              window
                                                                                  .newPoolInfo
                                                                                  .amounts[0]
                                                                          )
                                                                  ) /
                                                                      10000000000)
                                                              ).toString()
                                                          updatePage()
                                                      }
                                                  )
                                                  return "0"
                                              })())
                                    }
                                />
                            </Description>
                        }
                        denied={inputErrors[1] || inputErrors[2]}
                        completed={
                            window.REFRESHER[3] ??
                            (() => {
                                window.REFRESHER[3] = new Refresh(
                                    () =>
                                        new Promise(resolve =>
                                            getNewPoolInfo().then(async res => {
                                                window.newPoolInfo = res
                                                const [
                                                    OCTOnRef,
                                                    stNEAROnRef,
                                                    stNEAR
                                                ] = await Promise.all([
                                                    getOctBalanceOnRef(),
                                                    getStnearBalanceOnRef(),
                                                    getStnearBalance()
                                                ])
                                                window.OCTBalanceOnRef =
                                                    OCTOnRef
                                                window.stNEARBalanceOnRef =
                                                    stNEAROnRef
                                                window.stNEARBalance = stNEAR
                                                resolve(false)
                                            })
                                        )
                                )
                                return window.REFRESHER[3]
                            })()
                        }
                        action={() => {
                            addLiquidity(
                                (
                                    BigInt(
                                        utils.format.parseNearAmount(
                                            inputValues[2]
                                        )!
                                    ) - BigInt(window.stNEARBalanceOnRef)
                                ).toString(),
                                [
                                    utils.format.parseNearAmount(
                                        inputValues[2]
                                    )!,
                                    (
                                        BigInt(
                                            utils.format.parseNearAmount(
                                                inputValues[1]
                                            )!
                                        ) / BigInt("1000000")
                                    ).toString()
                                ]
                            )
                        }}
                    />
                    <StepComponent
                        title="2. Stake on the OCT <-> stNEAR farm."
                        description={
                            <Description>
                                <Break />
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
                                <Warning>
                                    Temporarily disabled, waiting for OCT{" "}
                                    {"<->"} stNEAR farm.
                                </Warning>
                            </Description>
                        }
                        // TEMP
                        denied={true}
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
                                ) // leave 1 LP share to occupy storage, https://github.com/ref-finance/ref-contracts/issues/36
                                    .toString()
                            )
                        }
                    />
                    <NavButtonComponent next back />
                </>
            )

        case 3:
            if (window.REFRESHER[5] === undefined)
                window.REFRESHER[5] = new Refresh(
                    () =>
                        new Promise(resolve =>
                            getNewFarmingStake().then(res => {
                                window.newFarmingStake = res
                                resolve(true)
                            })
                        ),
                    0
                )
            return (
                <>
                    <TitleComponent title="Happy Farming!" />
                    <img src={meme} alt="meme" />
                    <Box
                        sx={{
                            my: 2
                        }}
                    >
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
                            {""} LP shares in the farm.
                        </span>
                    </Box>
                    <NavButtonComponent back />
                </>
            )

        case 4:
            if (window.REFRESHER[6] === undefined)
                window.REFRESHER[6] = new Refresh(
                    () =>
                        new Promise(async resolve => {
                            const [
                                oldPosition,
                                wNEARBalanceOnRef,
                                stNEARBalanceOnRef,
                                OCTBalanceOnRef,
                                stNEARBalance,
                                newPoolInfo,
                                newFarmingStake
                            ] = await Promise.all([
                                getOldPosition(),
                                getWnearBalanceOnRef(),
                                getStnearBalanceOnRef(),
                                getOctBalanceOnRef(),
                                getStnearBalance(),
                                getNewPoolInfo(),
                                getNewFarmingStake()
                            ])
                            window.oldPosition = oldPosition
                            window.wNEARBalanceOnRef = wNEARBalanceOnRef
                            window.stNEARBalanceOnRef = stNEARBalanceOnRef
                            window.OCTBalanceOnRef = OCTBalanceOnRef
                            window.stNEARBalance = stNEARBalance
                            window.newPoolInfo = newPoolInfo
                            window.newFarmingStake = newFarmingStake
                            resolve(true)
                        }),
                    0
                )
            const rows = [
                {
                    location: "OCT <-> wNEAR Farm",
                    link: `https://app.ref.finance/farms`,
                    amount: window?.oldPosition?.user_farm_shares,
                    unit: "LP"
                },
                {
                    location: "OCT <-> wNEAR Pool",
                    link: `https://app.ref.finance/pool/${OLD_POOL_ID}`,
                    amount: window?.oldPosition?.user_lp_shares,
                    unit: "LP"
                },
                {
                    location: "Ref-Finance",
                    link: `https://app.ref.finance/account`,
                    amount: window?.wNEARBalanceOnRef,
                    unit: "wNEAR",
                    noline: true
                },
                {
                    location: "",
                    link: `https://app.ref.finance/account`,
                    amount: window?.OCTBalanceOnRef,
                    unit: "OCT",
                    noline: true
                },
                {
                    location: "",
                    link: `https://app.ref.finance/account`,
                    amount: window?.stNEARBalanceOnRef,
                    unit: "stNEAR"
                },
                {
                    location: "NEAR wallet",
                    link: `https://wallet.near.org/`,
                    amount: window?.stNEARBalance,
                    unit: "stNEAR"
                },
                {
                    location: "OCT <-> stNEAR Pool",
                    link: `https://app.ref.finance/pool/${NEW_POOL_ID}`,
                    amount: window?.newPoolInfo?.user_shares,
                    unit: "LP"
                },
                {
                    location: "OCT <-> stNEAR Farm",
                    link: `https://app.ref.finance/farms`,
                    amount: window?.newFarmingStake,
                    unit: "LP"
                }
            ]
            return (
                <>
                    <TableContainer>
                        <Table
                            stickyHeader
                            sx={{
                                width: 1
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell>Location</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell align="left"></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map(row => (
                                    <TableRow
                                        key={row.location}
                                        sx={
                                            row.noline
                                                ? {
                                                      "& *": {
                                                          border: 0
                                                      }
                                                  }
                                                : {
                                                      "&:last-child td, &:last-child th":
                                                          { border: 0 }
                                                  }
                                        }
                                    >
                                        <TableCell
                                            component="th"
                                            scope="row"
                                            sx={{
                                                cursor: "pointer"
                                            }}
                                            onClick={event =>
                                                (window.location.href =
                                                    row.link)
                                            }
                                        >
                                            {row.location !== "" ? (
                                                <>
                                                    {row.location}&nbsp;
                                                    <Icon
                                                        sx={{
                                                            verticalAlign: "middle",
                                                            ml: 1,
                                                            color: "#aaa",
                                                            fontSize: "1.2em",
                                                            "&:hover": {
                                                                color: "#000"
                                                            }
                                                        }}
                                                    >
                                                        open_in_new
                                                    </Icon>
                                                </>
                                            ) : (
                                                <>&nbsp;</>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {row.amount
                                                ? parseFloat(
                                                      utils.format.formatNearAmount(
                                                          row.amount +
                                                              (row.unit ===
                                                              "OCT"
                                                                  ? "000000"
                                                                  : "")
                                                      )!
                                                  ).toFixed(3)
                                                : "..."}{" "}
                                        </TableCell>
                                        <TableCell sx={{ width: "10ch" }}>
                                            {row.unit}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )

        default:
            return <TitleComponent title="Something went wrong" />
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
