# IndexedDB wrapper
A simple wrapper around IndexedDB to make CRUD operations simpler

## Initialize
```javascript
import IDB from 'idb-wrapper'
```

Set config and initialize (multiple tables supported)
```javascript
const config = {
    name: 'MyTestIDB',
    version: 13,
    stores: [
        {
            storeName: 'posts',
            key: 'id',
            initialData: [
                { name: 'Peter Pan', city: 'London' },
                { name: 'Donald Duck', city: 'Andeby'}
            ], 
            indexes: [
                {
                    field: "name",
                    name: "name",
                    unique: false
                }
            ]
        }
    ]
}
const idb = new IDB(config)
await idb.open() // Returns a promise
```
If your version changes, it assumes the data needs to be refreshed. If you want to delete the current database and build it again
```javascript
const idb = new IDB(config, true) // Sets the destructive flag
async function start () {
    let retries = window.sessionStorage.getItem('reloadRetries') || 0
    try {
        db = await idb.open()
        return db
    } catch (error) {
        if (retries < 1) {
            window.sessionStorage.setItem('reloadRetries', retries++)
            console.log('Reloading')
            window.location.reload()
        } else {
            console.log(error)
        }
    }
    
}
```
Each store has a corresponding property in the database object. Using the config above, the methods below would be accessed by: db.posts.findAll()
## idb Methods
### count(): (Promise)
Return the number of entries in that objectstore
```
await db.posts.count()
```
### keys(): (Promise)
Returns all keys in that objectstore
```
    await db.posts.count()
```
### find(key): (Promise)
Returns the entry with the corresponding key
```
    await db.posts.find(key)
```
### insert(query): (Promise)
Inserts a new entry
```
    await db.posts.insert({
        name: 'Some name'
    })
```
### delete(key): (Promise)

```
    db.posts.delete(1)
```
### flush(): (Promise)
Deletes all entries
```
    db.posts.clear()
```