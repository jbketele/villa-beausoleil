let unavailablePeriods = [];
let currentDate = new Date();
let selectedArrival = null;
let selectedDeparture = null;

const pricePerNight = 257;
const minimumNights = 2;

// Taxe de séjour : 5 % du prix de la nuitée par personne
// + 10 % de taxe additionnelle départementale
const touristTaxRate = 0.05;
const departmentTaxRate = 0.10;

const monthNames = [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre'
];


// =========================
// CALENDRIER
// =========================

async function loadCalendar() {

    try {

        const response =
            await fetch('/.netlify/functions/calendar');

        if (!response.ok) {
            throw new Error(
                'Impossible de récupérer le calendrier.'
            );
        }

        unavailablePeriods =
            await response.json();

        console.log(
            'Dates indisponibles :',
            unavailablePeriods
        );

        renderCalendar();

    } catch (error) {

        console.error(
            'Erreur calendrier :',
            error
        );
    }
}


function renderCalendar() {

    const calendarDays =
        document.getElementById('calendarDays');

    const currentMonth =
        document.getElementById('currentMonth');

    if (!calendarDays || !currentMonth) {
        return;
    }

    const year =
        currentDate.getFullYear();

    const month =
        currentDate.getMonth();

    currentMonth.textContent =
        `${monthNames[month]} ${year}`;

    calendarDays.innerHTML = '';

    const firstDay =
        new Date(year, month, 1);

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    let firstDayIndex =
        firstDay.getDay() - 1;

    if (firstDayIndex < 0) {
        firstDayIndex = 6;
    }


    // Cases vides avant le 1er
    for (
        let i = 0;
        i < firstDayIndex;
        i++
    ) {

        const emptyDay =
            document.createElement('div');

        emptyDay.classList.add(
            'calendar-day',
            'empty'
        );

        calendarDays.appendChild(emptyDay);
    }


    // Jours du mois
    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            new Date(year, month, day);

        const dateString =
            formatDate(date);

        const dayElement =
            document.createElement('div');

        dayElement.classList.add(
            'calendar-day'
        );

        dayElement.textContent = day;

        const today =
            new Date();

        const todayString =
            formatDate(today);

        const isPast =
            dateString < todayString;

        const isToday =
            dateString === todayString;

        const isUnavailable =
            isDateUnavailable(dateString) || isPast;

        if (isToday) {
            dayElement.classList.add('today');
        }

        if (isUnavailable) {

            dayElement.classList.add(
                'unavailable'
            );

        } else {

            dayElement.classList.add(
                'available'
            );

            dayElement.setAttribute(
                'role',
                'button'
            );

            dayElement.setAttribute(
                'tabindex',
                '0'
            );

            dayElement.addEventListener(
                'click',
                () => {
                    selectDate(dateString);
                }
            );
        }


        // Date d'arrivée
        if (
            dateString === selectedArrival
        ) {

            dayElement.classList.add(
                'selected-arrival'
            );
        }


        // Date de départ
        if (
            dateString === selectedDeparture
        ) {

            dayElement.classList.add(
                'selected-departure'
            );
        }


        // Dates comprises entre arrivée et départ
        if (
            selectedArrival &&
            selectedDeparture &&
            dateString > selectedArrival &&
            dateString < selectedDeparture
        ) {

            dayElement.classList.add(
                'selected-range'
            );
        }


        calendarDays.appendChild(
            dayElement
        );
    }
}


function selectDate(dateString) {

    // Aucune arrivée sélectionnée
    if (!selectedArrival) {

        selectedArrival =
            dateString;

        renderCalendar();
        updateCalendarInstruction();
        updatePriceSummary();

        return;
    }


    // Clic sur la même date que l'arrivée
    // = annulation
    if (
        dateString === selectedArrival &&
        !selectedDeparture
    ) {

        selectedArrival = null;

        renderCalendar();
        updateCalendarInstruction();
        updatePriceSummary();

        return;
    }


    // Arrivée sélectionnée,
    // mais pas encore de départ
    if (!selectedDeparture) {

        // Si la date est avant l'arrivée,
        // elle devient la nouvelle arrivée
        if (
            dateString < selectedArrival
        ) {

            selectedArrival =
                dateString;

            renderCalendar();
            updateCalendarInstruction();
            updatePriceSummary();

            return;
        }

        // Vérifie le nombre minimum de nuits
        const arrivalDate =
            new Date(selectedArrival);

        const departureDate =
            new Date(dateString);

        const numberOfNights =
            Math.round(
                (departureDate - arrivalDate) /
                (1000 * 60 * 60 * 24)
            );

        if (numberOfNights < minimumNights) {

            alert(
                `${minimumNights} nuits minimum.`
            );

            return;
        }

        // Vérifie que toute la période
        // est disponible
        if (
            !isRangeAvailable(
                selectedArrival,
                dateString
            )
        ) {

            alert(
                'Cette période comprend des dates indisponibles.'
            );

            return;
        }


        // Deuxième sélection = départ
        selectedDeparture =
            dateString;

        renderCalendar();
        updateCalendarInstruction();
        updatePriceSummary();

        return;
    }


    // Arrivée + départ déjà sélectionnés :
    // nouveau clic = nouvelle sélection
    selectedArrival =
        dateString;

    selectedDeparture = null;

    renderCalendar();
    updateCalendarInstruction();
    updatePriceSummary();
}


// =========================
// INDICATION CALENDRIER
// =========================

function updateCalendarInstruction() {

    const instruction =
        document.getElementById(
            'calendarInstruction'
        );

    if (!instruction) {
        return;
    }


    if (!selectedArrival) {

        instruction.textContent =
            'Sélectionnez votre date d’arrivée';

        return;
    }


    if (!selectedDeparture) {

        instruction.textContent =
            'Sélectionnez votre date de départ';

        return;
    }


    const arrival =
        new Date(selectedArrival);

    const departure =
        new Date(selectedDeparture);

    instruction.textContent =
        `Séjour du ${formatDisplayDate(arrival)} au ${formatDisplayDate(departure)}`;
}


function formatDisplayDate(date) {

    return date.toLocaleDateString(
        'fr-FR',
        {
            day: 'numeric',
            month: 'long'
        }
    );
}


// =========================
// CALCUL DU PRIX
// =========================

function calculateNights() {

    if (
        !selectedArrival ||
        !selectedDeparture
    ) {

        return 0;
    }

    const arrival =
        new Date(selectedArrival);

    const departure =
        new Date(selectedDeparture);

    const difference =
        departure.getTime() -
        arrival.getTime();

    return Math.round(
        difference /
        (1000 * 60 * 60 * 24)
    );
}


function calculateNumberOfGuests() {

    const guestsInput =
        document.getElementById('voyageurs');

    if (!guestsInput) {
        return 1;
    }

    return Number(guestsInput.value) || 1;
}

function updatePriceSummary() {

    const stayPriceElement =
        document.getElementById(
            'stayPrice'
        );

    const touristTaxElement =
        document.getElementById(
            'touristTax'
        );

    const totalPriceElement =
        document.getElementById(
            'totalPrice'
        );

    if (
        !stayPriceElement ||
        !touristTaxElement ||
        !totalPriceElement
    ) {

        return;
    }


    const nights =
        calculateNights();

    const guests =
        calculateNumberOfGuests();


    // Pas encore de séjour sélectionné
    if (!nights) {

        stayPriceElement.textContent =
            '0,00 €';

        touristTaxElement.textContent =
            '0,00 €';

        totalPriceElement.textContent =
            '0,00 €';

        return;
    }


    // Prix de la location
    const stayPrice =
        nights * pricePerNight;


    // Taxe de séjour
    const pricePerPersonPerNight =
        pricePerNight / guests;

    // 5 % de la part de la nuitée par personne
    const baseTax =
        Math.round(
            pricePerPersonPerNight *
            0.05 *
            100
        ) / 100;

    // Taxe additionnelle départementale de 10 %
    const departmentTax =
        Math.round(
            baseTax *
            0.10 *
            100
        ) / 100;

    // Taxe de séjour par personne et par nuit
    const touristTaxPerPersonPerNight =
        Math.round(
            (baseTax + departmentTax) *
            100
        ) / 100;

    // Taxe totale
    const touristTax =
        Math.round(
            touristTaxPerPersonPerNight *
            guests *
            nights *
            100
        ) / 100;

    // Total
    const total =
        stayPrice + touristTax;

    stayPriceElement.textContent =
        `${stayPrice.toFixed(2).replace('.', ',')} €`;

    touristTaxElement.textContent =
        `${touristTax.toFixed(2).replace('.', ',')} €`;

    totalPriceElement.textContent =
        `${total.toFixed(2).replace('.', ',')} €`;

    const formStayPrice =
        document.getElementById('formStayPrice');

    const formTouristTax =
        document.getElementById('formTouristTax');

    const formTotalPrice =
        document.getElementById('formTotalPrice');

    if (formStayPrice) {
        formStayPrice.value =
            stayPrice.toFixed(2);
    }

    if (formTouristTax) {
        formTouristTax.value =
            touristTax.toFixed(2);
    }

    if (formTotalPrice) {
        formTotalPrice.value =
            total.toFixed(2);
    }
}


// =========================
// DISPONIBILITÉS
// =========================

function isRangeAvailable(
    startDate,
    endDate
) {

    const current =
        new Date(startDate);

    const end =
        new Date(endDate);


    while (current < end) {

        const dateString =
            formatDate(current);

        if (
            isDateUnavailable(dateString)
        ) {

            return false;
        }

        current.setDate(
            current.getDate() + 1
        );
    }


    return true;
}


function formatDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, '0');

    const day =
        String(
            date.getDate()
        ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}


function isDateUnavailable(dateString) {

    return unavailablePeriods.some(
        period => {

            return (
                dateString >= period.start &&
                dateString < period.end
            );
        }
    );
}


// =========================
// NAVIGATION DES MOIS
// =========================

// Mois précédent
document
    .getElementById('prevMonth')
    ?.addEventListener(
        'click',
        () => {

            currentDate.setMonth(
                currentDate.getMonth() - 1
            );

            renderCalendar();
        }
    );


// Mois suivant
document
    .getElementById('nextMonth')
    ?.addEventListener(
        'click',
        () => {

            currentDate.setMonth(
                currentDate.getMonth() + 1
            );

            renderCalendar();
        }
    );


// =========================
// RÉSERVATION
// =========================

function fillReservationDates() {

    const arrivalInput =
        document.getElementById(
            'arrivee'
        );

    const departureInput =
        document.getElementById(
            'depart'
        );

    if (
        !arrivalInput ||
        !departureInput
    ) {

        return;
    }


    arrivalInput.value =
        selectedArrival || '';

    departureInput.value =
        selectedDeparture || '';

    updatePriceSummary();
}


// Ouverture du modal
document
    .getElementById(
        'openReservationModal'
    )
    ?.addEventListener(
        'click',
        () => {

            fillReservationDates();
        }
    );

// =========================
// COMPTEUR VOYAGEURS
// =========================

const guestCountElement =
    document.getElementById('guestCount');

const guestsInput =
    document.getElementById('voyageurs');

const guestMinusButton =
    document.getElementById('guestMinus');

const guestPlusButton =
    document.getElementById('guestPlus');


function updateGuestCount(guests) {

    console.log('updateGuestCount appelée avec :', guests);
    console.log(
        'Valeur actuelle affichée :',
        guestCountElement?.textContent
    );

    if (!guestCountElement || !guestsInput) {
        return;
    }

    guests = Math.max(1, Math.min(8, guests));

    console.log('Valeur après limite :', guests);

    guestCountElement.textContent = guests;
    guestsInput.value = guests;

    updatePriceSummary();

    console.log(
        'Valeur finale affichée :',
        guestCountElement.textContent
    );
}


guestMinusButton?.addEventListener(
    'click',
    () => {

        const guests =
            Number(guestCountElement.textContent) || 1;

        updateGuestCount(guests - 1);
    }
);


guestPlusButton?.addEventListener('click', () => {

    console.log('--- CLICK PLUS ---');

    const guests =
        Number(guestCountElement.textContent) || 1;

    console.log('Avant + :', guests);

    updateGuestCount(guests + 1);

    console.log(
        'Après updateGuestCount :',
        guestCountElement.textContent
    );
});


// =========================
// LANCEMENT
// =========================

loadCalendar();

// =========================
// ENVOI DE LA DEMANDE
// =========================

const reservationForm =
    document.querySelector('form[name="reservation"]');

reservationForm?.addEventListener('submit', async (event) => {

    event.preventDefault();

    const submitButton =
        reservationForm.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = 'Envoi en cours...';

    try {

        const formData =
            new FormData(reservationForm);

        await fetch('/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(formData).toString()
        });

        reservationForm.innerHTML = `
            <div class="reservation-success">
                <h3>Demande envoyée !</h3>

                <p>
                    Votre demande de réservation a bien été envoyée.
                </p>

                <p>
                    Nous allons vérifier les disponibilités
                    et revenir vers vous rapidement.
                </p>
            </div>
        `;

    } catch (error) {

        console.error(
            'Erreur lors de l’envoi :',
            error
        );

        submitButton.disabled = false;
        submitButton.textContent =
            'Envoyer ma demande';

        alert(
            'Une erreur est survenue lors de l’envoi. Veuillez réessayer.'
        );
    }
});