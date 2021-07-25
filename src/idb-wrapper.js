import $log from './log.js'
export default class IDB {
    constructor (config, destructive = false) {
        this._checkSupport()
        this.mode = 'prod'
        this.config = config
        this.destructive = destructive
        return this
    }


    _checkSupport () {
        if (!window.indexedDB) {
            $log('This browser does not support IndexedDB', 'error')
        }
        return window.indexedDB
    }

    _createProperties (handle) {
        this.config.stores.forEach((conf) => {
            this[conf.storeName] = new DatabaseOperations(this.$db, conf.storeName)
        })
    }

    open () {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(this.config.name, this.config.version)
            request.onerror = (event) => {
                if (this.destructive) {
                    this._deleteDatabase()
                }
                
                console.log('Error opening Database. Check logs')
                reject(event.target.error.message)
            }
            request.onversionchange = (event) => {
                console.log('New version is availables')
            }
            request.onsuccess = (event) => {
                const db = event.target.result
                
                db.onversionchange = event => {
                    this._deleteDatabase()
                    db.close()
                    console.log('Please upgrade DB')
                }
                this.$db = db
                this._createProperties(this.$db)
                resolve(this)
            }
            request.onupgradeneeded = (event) => {
                this.$db = event.target.result
                this._createStores()
                
            }
            request.onblocked = (event) => {
                console.log('Database blocked by another window.')
            }
        })
        
    }

    _deleteDatabase () {
        try {
            const deleteRequest = window.indexedDB.deleteDatabase(this.config.name)
            deleteRequest.onsuccess = (event) => {
                console.log('Removed outdated database')
            }
            this._createStores()
        } catch (error) {
            console.log('No actions needed')
            
        }
        
        
    }

    _createStores() {
        this.config.stores.forEach((config) => {
            this._createStore(config)
        })
    }
    _createStore (config) {
        const store = this.$db.createObjectStore(config.storeName, {
            keyPath: config.key,
            autoIncrement: true
        })
        // Create Indexes
        config.indexes.forEach((index) => {
            store.createIndex(index.field, index.name, { unique: index.unique })
        })
        store.transaction.oncomplete = (event) => {
            const s = this.$db.transaction(config.storeName, 'readwrite').objectStore(config.storeName)
            config.initialData.forEach((row) => {
                s.add(row)

            })
        }
    }

}

const transactionPromise = (transaction, data) => {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            resolve(data)
        }
        transaction.onerror = () => {
            reject(transaction.error)
            throw new Error(transaction.error)
        }
    })
}

const _getAll = (transaction, storeName, offset, direction) => {
    let dir = direction === 'ASC' ? 'next' : 'prev'
    return transaction.objectStore(storeName).openCursor(IDBKeyRange.lowerBound(offset), dir)
}

const requestPromise = (request, data) => {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            let successData = data
            if (data.property) {
                successData = request[data.property]
            }
            resolve(successData)
        }
        request.onerror = () => {
            reject
            throw new Error(request.error)
        }
    })
}


class DatabaseOperations {
    constructor (_handle, name) {
        this._handle = _handle
        this.name = name
    }

    _sendEvent (name) {
        const event = new Event(name)
        window.dispatchEvent(event)
    }

    count () {
        const t = this._handle.transaction([this.name], 'readonly')
        const store = t.objectStore(this.name).count()
        return requestPromise(store, { property: 'result' })
    }

    keys () {
        const t = this._handle.transaction([this.name], 'readonly')
        const store = t.objectStore(this.name).getAllKeys()
        return requestPromise(store, { property: 'result' })
    }

    find (index) {
        const t = this._handle.transaction([this.name], 'readonly')
        const store = t.objectStore(this.name).get(index)
        return requestPromise(store, { property: 'result' })
    }

    async findAll (opts) {
        const defaultOptions = {
            limit: -1,
            offset: 0,
            direction: 'ASC'
        }
        const options = Object.assign(defaultOptions, opts)
        const t = this._handle.transaction([this.name], 'readonly')
        const query = t.objectStore(this.name).getAll()
        const results = await requestPromise(query, { property: 'result' })
        const output = results.slice(options.offset, options.limit)
        return output
    }

    insert (data) {
        const t = this._handle.transaction([this.name], 'readwrite')
        const store = t.objectStore(this.name).add(data)
        this._sendEvent('DbUpdated')
        return requestPromise(store, { property: 'result'})
    }

    update (index, data) {
        $log(`Updating #${index}`, data)
        const t = this._handle.transaction([this.name], 'readwrite')
        const store = t.objectStore(this.name).put(data)
        return requestPromise(store, data)
    }

    delete (index) {
        const t = this._handle.transaction([this.name], 'readwrite')
        const store = t.objectStore(this.name).delete(index)
        return requestPromise(store, data)
    }

    flush () {
        const t = this._handle.transaction([this.name], 'readwrite')
        const query = t.objectStore(this.name).clear()
        return requestPromise(query, {msg: 'Cleared'})
    }
}