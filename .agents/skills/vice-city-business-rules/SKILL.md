---

name: vice-city-business-rules
description: Use this skill when implementing, modifying, reviewing, or validating functionality affected by Vice City business rules.
--------------------------------------------------------------------------------------------------------------------------------------

# Vice City Business Rules

## Purpose

Ensure that application logic respects the business rules defined for the Vice City sports complex.

Business rules have priority over assumptions made by the agent.

If a requirement is unclear or conflicts with an existing business rule, do not invent a solution. Ask for clarification.

## Reservations

* Reservations are made for a specific service instance.
* A reservation cannot be moved dynamically from one service instance to another.
* A normal reservation can be made up to 15 days in advance.
* A reservation can be made until 1 second before the start time.
* An active time slot can still be purchased after it has started if it has not ended.
* Purchasing an active slot does not extend its end time.
* Maximum reservation duration is 9 hours.
* There are no client cancellations in the MVP.
* There are no refunds in the MVP.

## Payment

* A reservation has a payment hold of exactly 10 minutes.
* If payment fails or the process is abandoned, the hold must be released.
* A reservation is not confirmed until the required payment process is successfully completed.

## Services and Capacity

The system must respect the configured capacity and availability of each service.

Current capacities:

* Large football: 11
* Microfootball: 11
* Multi-sport court: 11
* Gym: 20
* Wet area: 10
* Pools: 50 people per pool per hour

The complex has:

* 1 large football court
* 1 microfootball court
* 1 multi-sport court
* 3 adult pools
* 1 children's pool

## Prices

Initial prices are:

* Pool: $2,000 per hour
* Large football: $140,000 per hour
* Microfootball: $80,000 per hour
* Multi-sport court: $70,000 per hour
* Gym: $2,000 per hour
* Wet area: $4,000 per hour

Prices must be configurable by the administrator.

When a reservation is created, its applied price must remain associated with that reservation even if the current service price changes later.

## Discounts

Every reservation made on Wednesday receives a 20% discount.

The full-pool reservation also has a 20% discount.

The Wednesday discount and full-pool reservation discount cannot be combined.

Only one 20% discount can be applied to a reservation.

## Full Pool Reservation

A full-pool reservation:

* Covers the complete operating day.
* Uses the 8:00 AM to 5:00 PM period.
* Can be booked up to 20 days in advance.
* Receives a 20% discount.
* Cannot be booked on Friday, Saturday, Sunday, or a Monday holiday.

## Operating Hours

The complex operates from:

```text
8:00 AM — 5:00 PM
```

## Maintenance

Maintenance is scheduled every Monday.

If Monday is a holiday, maintenance moves to Tuesday.

The reservation system must respect maintenance blocks when determining availability.

## Payments and Availability

Availability must be validated before confirming a reservation.

The same availability, capacity, pricing, and business rules must apply to:

* Online reservations
* Employee POS reservations

The POS must not implement a separate set of reservation rules.

## Tickets and QR

A reservation generates a digital ticket.

The QR information includes:

* Client name
* Reservation date
* Reservation time
* Service or zone
* Authorization status
* Authorization date and time
* Expiration

The QR is valid only during the reservation window.

An employee must explicitly authorize entry using the corresponding action in the system.

The authorization must be recorded.

## QR Transfer

A client may transfer a valid QR/ticket to another person.

The transfer must preserve the validity and rules of the original reservation.

## Wristbands

The physical wristband color corresponds to the reservation category.

Current colors:

* Pools: blue
* Wet area: purple
* Courts: green
* Gym: red

The application must show the corresponding wristband information to the employee.

## Roles

The system has three main roles:

* Administrator
* Client
* Employee

Employees may have specific responsibilities such as:

* Vendedor
* Lector / Validador QR

Employee permissions must be respected according to their assigned responsibilities.

## POS

Employees can create reservations through the POS.

The POS must collect the necessary information, including:

* Client name
* Client identification
* Date
* Time
* Service or zone

The POS uses the same business rules as online reservations.

## Administration

Administrators can:

* Manage services and categories.
* Configure prices.
* Manage employees.
* Change employee assignments between zones or categories.
* Review reservations.
* Review sales and income information.

Historical reservations must retain their original applied price.

## Reports

The system must support information such as:

* Sales by service.
* Sales by category.
* Sales by date.
* Sales by period.
* Highest sales day.
* Income by period.

Do not invent a profit calculation that has not been defined by the business requirements.

## Rule Priority

When implementing functionality:

1. Check the existing code.
2. Check the relevant business rules.
3. Follow the explicit requirement.
4. If the requirement conflicts with an existing rule, do not silently choose one.
5. Ask for clarification when necessary.

Do not invent business rules.
