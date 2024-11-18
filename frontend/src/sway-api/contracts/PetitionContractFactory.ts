/* Autogenerated file. Do not edit manually. */

/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-imports */

/*
  Fuels version: 0.97.0
  Forc version: 0.66.4
  Fuel-Core version: 0.40.0
*/

import { Contract, ContractFactory, decompressBytecode } from "fuels";
import type { Provider, Account, DeployContractOptions, DeployContractResult } from "fuels";

import { PetitionContract } from "./PetitionContract";

const bytecode = decompressBytecode("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");

export class PetitionContractFactory extends ContractFactory {

  static readonly bytecode = bytecode;

  constructor(accountOrProvider: Account | Provider) {
    super(bytecode, PetitionContract.abi, accountOrProvider);
  }

  override deploy<TContract extends Contract = Contract>(
    deployOptions?: DeployContractOptions
  ): Promise<DeployContractResult<TContract>> {
    return super.deploy({
      storageSlots: PetitionContract.storageSlots,
      ...deployOptions,
    });
  }

  static async deploy (
    wallet: Account,
    options: DeployContractOptions = {}
  ): Promise<DeployContractResult<PetitionContract>> {
    const factory = new PetitionContractFactory(wallet);
    return factory.deploy(options);
  }
}