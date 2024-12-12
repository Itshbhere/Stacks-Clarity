;; Token Marketplace Contract

;; Import token trait
(use-trait sip010-token 
  .krypt-token.sip010-trait
)

;; Contract owner
(define-constant contract-owner tx-sender)

;; Error constants
(define-constant err-owner-only (err u100))
(define-constant err-insufficient-balance (err u101))
(define-constant err-token-transfer-failed (err u102))
(define-constant err-invalid-amount (err u103))

;; Token sale parameters
(define-data-var tokens-available uint u0)
(define-data-var price-per-token uint u10) ;; 10 STX per token

;; Token storage mapping
(define-map token-balances 
  principal 
  uint
)

;; Receive tokens function
(define-public (receive-tokens 
  (token-contract <sip010-token>)
  (amount uint)
)
  (begin
    ;; Transfer tokens to contract
    (try! (contract-call? token-contract transfer 
      amount 
      tx-sender 
      (as-contract tx-sender)
      none
    ))
    
    ;; Update available tokens
    (var-set tokens-available (+ (var-get tokens-available) amount))
    
    ;; Track individual contributor balances
    (map-set token-balances 
      tx-sender 
      (+ (default-to u0 (map-get? token-balances tx-sender)) amount)
    )
    
    (print {
      type: "tokens-received", 
      sender: tx-sender, 
      amount: amount
    })
    
    (ok true)
  )
)

;; Buy tokens function
(define-public (buy-tokens 
  (token-contract <sip010-token>)
  (amount uint)
)
  (let 
    (
      ;; Calculate total cost in STX
      (total-cost (* amount (var-get price-per-token)))
      
      ;; Check available tokens
      (available (var-get tokens-available))
    )
    (begin
      ;; Validate token availability
      (asserts! (>= available amount) err-insufficient-balance)
      
      ;; Transfer STX to contract
      (try! (stx-transfer? total-cost tx-sender (as-contract tx-sender)))
      
      ;; Transfer tokens to buyer
      (try! (contract-call? token-contract transfer 
        amount 
        (as-contract tx-sender)
        tx-sender 
        (some (sha256 (concat 
          (principal-to-buff tx-sender) 
          (int-to-buff amount)
        )))
      ))
      
      ;; Update available tokens
      (var-set tokens-available (- available amount))
      
      (print {
        type: "tokens-sold", 
        buyer: tx-sender, 
        amount: amount, 
        total-cost: total-cost
      })
      
      (ok true)
    )
  )
)

;; Withdraw STX (only by owner)
(define-public (withdraw-stx (amount uint))
  (begin
    ;; Ensure only contract owner can withdraw
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    
    ;; Transfer STX to owner
    (try! (stx-transfer? amount (as-contract tx-sender) contract-owner))
    
    (ok true)
  )
)

;; Update token price (only by owner)
(define-public (update-token-price (new-price uint))
  (begin
    ;; Ensure only contract owner can update price
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    
    (var-set price-per-token new-price)
    
    (ok true)
  )
)

;; Withdraw remaining tokens (only by owner)
(define-public (withdraw-tokens 
  (token-contract <sip010-token>)
  (amount uint)
)
  (begin
    ;; Ensure only contract owner can withdraw
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    
    ;; Check available tokens
    (asserts! (>= (var-get tokens-available) amount) err-insufficient-balance)
    
    ;; Transfer tokens back to owner
    (try! (contract-call? token-contract transfer 
      amount 
      (as-contract tx-sender)
      contract-owner 
      none
    ))
    
    ;; Update available tokens
    (var-set tokens-available (- (var-get tokens-available) amount))
    
    (ok true)
  )
)

;; Get contract details
(define-read-only (get-contract-details)
  {
    tokens-available: (var-get tokens-available),
    price-per-token: (var-get price-per-token),
    contract-owner: contract-owner
  }
)

;; Get user token balance
(define-read-only (get-user-token-balance (user principal))
  (default-to u0 (map-get? token-balances user))
)