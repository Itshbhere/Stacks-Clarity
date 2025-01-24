;; (define-constant STX_TOKEN 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.wstx)
(define-constant STONE_TOKEN 'SPQ5CEHETP8K4Q2FSNNK9ANMPAVBSA9NN86YSN59.stone-bonding-curve) 
(define-constant ERR-INSUFFICIENT-FUNDS (err 101))
(define-constant ERR-SWAP-FAILED (err 102))
(define-constant ERR-NOT-AUTHORIZED (err 103))
(define-constant ERR-ENTER-NEW-WALLET (err 104))
(define-constant ERR-TRANSFER-FAILED (err 105))

;; Hardcoded addresses for transfers
(define-constant WALLET-1 'SP2DXHX9Q844EBT80DYJXFWXJKCJ5CGHZ5MXPWB9N)  ;; 45% recipient
(define-constant WALLET-2 'SP2DXHX9Q844EBT80DYJXFWXJKCJ5CGHZ5MXPWB9M)  ;; 20% recipient
(define-constant STONE-RECIPIENT 'SP2DXHX9Q844EBT80DYJXFWXJKCJ5CGHZ5MXPWB9K)  ;; STONE token recipient

(define-data-var contract-owner principal tx-sender)

(define-public (set-contract-owner (owner principal))
  (begin  
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (asserts! (not (is-eq owner (var-get contract-owner))) ERR-ENTER-NEW-WALLET)
    (var-set contract-owner owner)
    (ok owner)
  )
)

(define-read-only (get-contract-owner)
  (ok (var-get contract-owner))
)

(define-public (swap (stx-amount uint))
  (begin 
    (asserts! (> stx-amount u0) ERR-INSUFFICIENT-FUNDS)

    (let 
      (
        ;; Define the swap path
        (swap-path 
          (list
            (tuple 
              (a "u") 
              (b 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.wstx-stone) 
              (c u79) 
              (d 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.wstx) 
              (e 'SPQ5CEHETP8K4Q2FSNNK9ANMPAVBSA9NN86YSN59.stone-bonding-curve) 
              (f true)
            )
          )
        )    
      )
   
      ;; Swap STX to STONE using the specified path
      (let 
        (
          (swapped-stone 
            (asserts! 
              (is-ok (contract-call? 
                'SP20X3DC5R091J8B6YPQT638J8NR1W83KN6TN5BJY.path-apply_staging
                apply 
                swap-path 
                stx-amount 
                (some 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.wstx) 
                (some 'SPQ5CEHETP8K4Q2FSNNK9ANMPAVBSA9NN86YSN59.stone-bonding-curve) 
                none none none 
                (some 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.univ2-share-fee-to) 
                none none none none none none none none
                none none none none none none none none
                none none none none none none none none
                none none none none
              ))
              ERR-SWAP-FAILED
            )
          )
        )
        
        ;; Return the swapped token amount
        (ok swapped-stone)
      )
    )
  )
)

(define-public (buy_diamonds (stx-amount uint))
(begin
    (asserts! (> stx-amount u0) ERR-INSUFFICIENT-FUNDS)
    
    (let
      (
        ;; Calculate the split amounts
        (amount-45-percent (/ (* stx-amount u45) u100))
        (amount-35-percent (/ (* stx-amount u35) u100))
        (amount-20-percent (/ (* stx-amount u20) u100))
      )
      
      ;; Transfer 45% to WALLET-1
      (asserts! 
        (is-ok (stx-transfer? amount-45-percent tx-sender WALLET-1)) 
        ERR-TRANSFER-FAILED
      )
      
      ;; Transfer 20% to WALLET-2
      (asserts! 
        (is-ok (stx-transfer? amount-20-percent tx-sender WALLET-2)) 
        ERR-TRANSFER-FAILED
      )
      
      ;; Swap 35% for STONE tokens
      (let 
        (
          (swapped-amount (try! (swap amount-35-percent)))
        )
        
        ;; Transfer the swapped STONE tokens to STONE-RECIPIENT
        (asserts!
          (is-ok 
            (contract-call? 
              STONE_TOKEN 
              transfer 
              swapped-amount 
              (as-contract tx-sender)  ;; Changed from tx-sender to contract's sender
              STONE-RECIPIENT 
              none
            )
          )
          ERR-TRANSFER-FAILED
        )
        
        ;; Return the amounts that were processed
        (ok (tuple 
          (stx-45-percent amount-45-percent)
          (stx-20-percent amount-20-percent)
          (stx-35-percent amount-35-percent)
          (stone-amount swapped-amount)
        ))
      )
    )
  )
)