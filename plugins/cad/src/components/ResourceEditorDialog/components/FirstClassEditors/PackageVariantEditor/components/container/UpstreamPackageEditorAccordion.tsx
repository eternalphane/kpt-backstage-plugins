/**
 * Copyright 2023 The Nephio Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Progress, SelectItem } from '@backstage/core-components';
import { Alert } from '@material-ui/lab';
import { TextField } from '@material-ui/core';
import React, { Fragment, useRef, useState, useEffect } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../../../../../../apis';
import { PackageVariantUpstream } from '../../../../../../../types/PackageVariant';
import { Repository } from '../../../../../../../types/Repository';
import { emptyIfUndefined } from '../../../../../../../utils/string';
import { Select } from '../../../../../../Controls';
import { EditorAccordion } from '../../../Controls';
import { AccordionState } from '../../../Controls/EditorAccordion';
import { PackageRevision } from '../../../../../../../types/PackageRevision';

type UpstreamPackageObjectEditorProps = {
  id: string;
  title: string;
  state: AccordionState;
  keyValueObject: PackageVariantUpstream;
  onUpdatedKeyValueObject: (arg0: PackageVariantUpstream) => void;
};

type InternalKeyValue = {
  repo: string;
  package: string;
  revision?: string;
};

type RepositorySelectItem = SelectItem & {
  repository?: Repository;
};

type PackageRevisionSelectItem = SelectItem & {
  packageRevision?: PackageRevision;
};

const mapRepositoryToSelectItem = (
  repository: Repository,
): RepositorySelectItem => ({
  label: repository.metadata.name,
  value: repository.metadata.name,
  repository: repository,
});

const mapPackageRevisionToSelectItem = (
  packageRevision: PackageRevision,
): PackageRevisionSelectItem => ({
  label: packageRevision.spec.packageName,
  value: packageRevision.metadata.name,
  packageRevision: packageRevision,
});

export const getRepositoryData = (allRepo: any[], name: string): Repository => {
  const repository = allRepo.find(thisRepo => thisRepo.metadata.name === name);
  return repository;
};

export const getPackageData = (
  allPackage: any[],
  name: string,
): PackageRevision => {
  const packages = allPackage.find(
    packageData => packageData.spec.packageName === name,
  );
  return packages;
};

export const UpstreamPackageEditorAccordion = ({
  id,
  title,
  state,
  keyValueObject,
  onUpdatedKeyValueObject,
}: UpstreamPackageObjectEditorProps) => {
  const api = useApi(configAsDataApiRef);
  const refViewModel = useRef<InternalKeyValue>(keyValueObject);
  const viewModel = refViewModel.current;
  const repositoryName = viewModel.repo;
  const packageName = viewModel.package;

  const [repository, setRepository] = useState<Repository>();
  const [packageRevision, setPackageRevision] = useState<PackageRevision>();
  const [repositorySelectItems, setRepositorySelectItems] = useState<
    RepositorySelectItem[]
  >([]);
  const [packageRevisionSelectItems, setPackageRevisionSelectItems] = useState<
    PackageRevisionSelectItem[]
  >([]);

  const keyValueObjectUpdated = (): void => {
    onUpdatedKeyValueObject(viewModel);
  };

  const { loading, error } = useAsync(async (): Promise<void> => {
    const [{ items: thisAllRepositories }, allPackages] = await Promise.all([
      api.listRepositories(),
      api.listPackageRevisions(),
    ]);

    const thisRepository = repositoryName
      ? getRepositoryData(thisAllRepositories, repositoryName)
      : undefined;

    const thisPackageRevision = getPackageData(allPackages, packageName);
    const targetRepositoryItems = thisAllRepositories.map(
      mapRepositoryToSelectItem,
    );
    const allowPackageRevisions = allPackages.map(
      mapPackageRevisionToSelectItem,
    );
    setRepository(thisRepository);
    setRepositorySelectItems(targetRepositoryItems);
    setPackageRevision(thisPackageRevision);
    setPackageRevisionSelectItems(allowPackageRevisions);
  }, [api]);

  useEffect(() => {
    viewModel.repo = repository ? repository?.metadata.name : '';
    onUpdatedKeyValueObject(viewModel);
  }, [repository, onUpdatedKeyValueObject, viewModel]);

  useEffect(() => {
    viewModel.package = packageRevision
      ? packageRevision?.spec.packageName
      : '';
    onUpdatedKeyValueObject(viewModel);
  }, [packageRevision, onUpdatedKeyValueObject, viewModel]);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  const description = `${viewModel.repo ? `${viewModel.repo}/` : ''}${
    viewModel.package ? `${viewModel.package}` : ''
  }${viewModel.revision ? `@${viewModel.revision}` : ''}`;

  return (
    <EditorAccordion
      id={id}
      state={state}
      title={title}
      description={description}
    >
      <Fragment>
        <Select
          label="Upstream Repository"
          onChange={selectedRepositoryName =>
            setRepository(
              repositorySelectItems.find(
                r => r.value === selectedRepositoryName,
              )?.repository,
            )
          }
          selected={emptyIfUndefined(repository?.metadata.name)}
          items={repositorySelectItems}
        />

        <Select
          label="Upstream Package"
          onChange={value =>
            setPackageRevision(
              packageRevisionSelectItems.find(r => r.value === value)
                ?.packageRevision,
            )
          }
          selected={emptyIfUndefined(packageRevision?.metadata.name)}
          items={packageRevisionSelectItems}
        />

        <TextField
          key="revision"
          label="Revision"
          variant="outlined"
          value={viewModel.revision}
          onChange={e => {
            viewModel.revision = e.target.value;
            keyValueObjectUpdated();
          }}
          fullWidth
        />
      </Fragment>
    </EditorAccordion>
  );
};
