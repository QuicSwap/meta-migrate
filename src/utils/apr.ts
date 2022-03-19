export function getFarmAPR(): Promise<any> {
    return fetch("https://validators.narwallets.com/metrics_json")
        .then(res => res.json())
}