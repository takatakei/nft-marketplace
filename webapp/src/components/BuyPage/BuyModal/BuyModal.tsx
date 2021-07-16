import React, { useState, useCallback } from 'react'
import { Header, Button } from 'decentraland-ui'
import { T, t } from 'decentraland-dapps/dist/modules/translation/utils'
import {
  Authorization,
  AuthorizationType
} from 'decentraland-dapps/dist/modules/authorization/types'
import { hasAuthorization } from 'decentraland-dapps/dist/modules/authorization/utils'
import { Network, NFTCategory } from '@dcl/schemas'
import { ContractName } from 'decentraland-transactions'
import { formatMANA } from '../../../lib/mana'
import { locations } from '../../../modules/routing/locations'
import { isPartner } from '../../../modules/vendor/utils'
import { getNFTName } from '../../../modules/nft/utils'
import { useFingerprint, useComputedPrice } from '../../../modules/nft/hooks'
import { NFT } from '../../../modules/nft/types'
import { getContractNames } from '../../../modules/vendor'
import { getContract } from '../../../modules/contract/utils'
import { NFTAction } from '../../NFTAction'
import { Mana } from '../../Mana'
import { AuthorizationModal } from '../../AuthorizationModal'
import { Props } from './BuyModal.types'

const BuyPage = (props: Props) => {
  const {
    nft,
    order,
    wallet,
    authorizations,
    isLoading,
    onNavigate,
    onExecuteOrder,
    isOwner,
    hasInsufficientMANA
  } = props

  const [fingerprint, isFingerprintLoading] = useFingerprint(nft)
  const [
    computedPrice,
    percentageIncrease,
    isAboveMaxPercentage
  ] = useComputedPrice(nft, order)
  const [showAuthorizationModal, setShowAuthorizationModal] = useState(false)
  const [wantsToProceed, setWantsToProceed] = useState(false)

  const handleExecuteOrder = useCallback(() => {
    onExecuteOrder(order!, nft, fingerprint)
  }, [order, nft, fingerprint, onExecuteOrder])

  if (!wallet) {
    return null
  }

  const contractNames = getContractNames()

  const mana = getContract({
    name: contractNames.MANA,
    network: nft.network
  })

  const marketplace = getContract({
    name: isPartner(nft.vendor)
      ? contractNames.MARKETPLACE_ADAPTER
      : contractNames.MARKETPLACE,
    network: nft.network
  })

  const authorization: Authorization = {
    address: wallet.address,
    authorizedAddress: marketplace.address,
    contractAddress: mana.address,
    contractName: ContractName.MANAToken,
    chainId: nft.chainId,
    type: AuthorizationType.ALLOWANCE
  }

  const handleToggleWantsToProceed = () => {
    setWantsToProceed(!wantsToProceed)
  }

  const handleSubmit = () => {
    if (hasAuthorization(authorizations, authorization)) {
      handleExecuteOrder()
    } else {
      setShowAuthorizationModal(true)
    }
  }

  const handleClose = () => setShowAuthorizationModal(false)

  const isDisabled =
    !order ||
    isOwner ||
    hasInsufficientMANA ||
    (!fingerprint && nft.category === NFTCategory.ESTATE)

  const name = <Name nft={nft} />

  let subtitle = null
  if (!order) {
    subtitle = <T id={'buy_page.not_for_sale'} values={{ name }} />
  } else if (
    !fingerprint &&
    nft.category === NFTCategory.ESTATE &&
    !isFingerprintLoading
  ) {
    subtitle = <T id={'buy_page.no_fingerprint'} />
  } else if (isOwner) {
    subtitle = <T id={'buy_page.is_owner'} values={{ name }} />
  } else if (hasInsufficientMANA) {
    subtitle = (
      <T
        id={'buy_page.not_enough_mana'}
        values={{
          name,
          amount: <Price network={nft.network} price={order.price} />
        }}
      />
    )
  } else if (isPartner(nft.vendor) && computedPrice) {
    subtitle = (
      <>
        <T
          id={'buy_page.subtitle'}
          values={{
            name,
            amount: <Price network={nft.network} price={order.price} />
          }}
        />
        {isAboveMaxPercentage ? (
          <div className="error">
            {t('buy_page.price_too_high', {
              category: t(`global.${nft.category}`),
              percentageIncrease
            })}
            <br />
            {t('buy_page.please_wait')}
          </div>
        ) : percentageIncrease > 0 ? (
          <div>
            <T
              id="buy_page.actual_price"
              values={{
                computedPrice: (
                  <Price network={nft.network} price={computedPrice} />
                )
              }}
            />
          </div>
        ) : null}
      </>
    )
  } else {
    subtitle = (
      <T
        id={'buy_page.subtitle'}
        values={{
          name,
          amount: <Price network={nft.network} price={order.price} />
        }}
      />
    )
  }

  return (
    <NFTAction nft={nft}>
      <Header size="large">
        {t('buy_page.title', { category: t(`global.${nft.category}`) })}
      </Header>
      <div className={isDisabled ? 'error' : ''}>{subtitle}</div>
      <div className="buttons">
        <Button
          onClick={() =>
            onNavigate(locations.nft(nft.contractAddress, nft.tokenId))
          }
        >
          {t('global.cancel')}
        </Button>

        {isDisabled ||
        !isAboveMaxPercentage ||
        (isAboveMaxPercentage && wantsToProceed) ? (
          <Button
            primary
            disabled={isDisabled || isLoading}
            onClick={handleSubmit}
            loading={isLoading}
          >
            {t('buy_page.buy')}
          </Button>
        ) : (
          <Button
            primary
            onClick={handleToggleWantsToProceed}
            loading={isLoading}
          >
            {t('buy_page.proceed_anyways')}
          </Button>
        )}
      </div>
      <AuthorizationModal
        open={showAuthorizationModal}
        authorization={authorization}
        onProceed={handleExecuteOrder}
        onCancel={handleClose}
      />
    </NFTAction>
  )
}

const Name = (props: { nft: NFT }) => <b>{getNFTName(props.nft)}</b>

const Price = (props: { network?: Network; price: string }) => (
  <Mana network={props.network} inline withTooltip>
    {formatMANA(props.price)}
  </Mana>
)

export default React.memo(BuyPage)
