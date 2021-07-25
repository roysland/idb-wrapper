const mode = 'dev'
const $log = (message, type = 'log') => {
    if (mode === 'dev') {
        switch (type) {
            case 'error':
                console.error(message)
            break
            default:
                console.log(message)
        }
    }
}

export default $log