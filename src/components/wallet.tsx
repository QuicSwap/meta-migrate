import * as React from "react"
import { Button, Icon } from "@mui/material"
import { initContracts } from "../services/near"

function signIn() {
    window.walletAccount.requestSignIn()
}

function signOut() {
    window.walletAccount.signOut()
    window.FORCEUPDATE()
}

export default function WalletComponent() {
    if (window.walletAccount === undefined) {
        window.nearInitPromise = initContracts().then(window.FORCEUPDATE);
        return <></>;
    }

    return (
        <Button
            sx={{
                position: "relative",
                right: 0
            }}
            onClick={() => {
                window.walletAccount.isSignedIn() ? signOut() : signIn()
            }}
            startIcon={<Icon>account_balance_wallet</Icon>}
        >
            {window.walletAccount.isSignedIn()
                ? `Logout ${window.walletAccount.getAccountId()}`
                : `Sign In`}
        </Button>
    )
}
