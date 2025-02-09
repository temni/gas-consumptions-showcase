# Gas consumption showcase
This is a demo project (ton, func, blueprint) showing how certain tricks might reduce gas consumtion.

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.

## How to use

### Build

**Tests do not compile contracts on the fly.** 

**Compiled code is commited into vcs.** 

**In case code has been changed it's required to build before tests!**

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`