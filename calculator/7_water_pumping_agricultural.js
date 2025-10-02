function Calculate07(Unit) {

    var To100 = 0.00;
    var More100 = 0.00;

    var Rate100 = 2.0889;
    var RateMore100 = 3.2405;

    //=+ROUND(IF($C$4<101,$C$4*C8, 100*C8),2)
    if (Unit < 101) {
        To100 = Unit * Rate100;
    } else {
        To100 = 100 * Rate100;
    }
    //=ROUND(IF($C$4<101,0,($C$4-100)*C9),2)
    if (Unit < 101) {
        More100 = 0;
    } else {
        More100 = (Unit - 100) * RateMore100;
    }

    //-------------- Calculate & Display Result --------------

    var Service = 115.16;
    var FT_ = GetFT();

    var Power = Round(To100) + Round(More100);
    var Base = Round(Power + Service);
    var FT = Round(Unit * (FT_ / 100)); //=ROUND(C4*(C5/100),2)
    var VAT = Round((Base + FT) * nowVAT); //ROUND((D17+D19)*0.07,2)
    var Summary = Base + FT + VAT;

    $("#txtResultPower").autoNumeric('set', Power);
    $("#txtResultService").autoNumeric('set', Service);
    $("#txtResultBase").autoNumeric('set', Base);
    $("#txtResultFT").autoNumeric('set', FT);
    $("#txtResultVat").autoNumeric('set', VAT);
    $("#txtResultSummary").autoNumeric('set', Summary);
}

function Calculate07_TOU(Volt, NeedOnPeak, NeedOffPeak, NeedHoliday, Peak, OffPeak, Holiday) {

    let year = $("#ddlYear").val();
    let FT_ = GetFT();
    let NeedRateOn = 0.00;
    let RateOn = 0.00;
    let RateOff = 0.00;
    let Service = 228.17;
    if (year > 2565) Service = 204.07;

    //แรงดัน 22-33 kV
    if (Volt == "1") {
        NeedRateOn = 132.93;
        RateOn = 4.1839;
        RateOff = 2.6037;
    }
    //แรงดันต่ำกว่า 22 kV
    else if (Volt == "2") {
        NeedRateOn = 210.00;
        RateOn = 4.3297;
        RateOff = 2.6369;
    }

    //=ROUND(IF(C4=2,C6*C16,IF(C4=1,C6*C15)),2)
    var NeedPower = Round(NeedOnPeak * NeedRateOn);

    //=IF(C4=2,(C9*C20)+((C10+C11)*D20),(C9*C19)+((C10+C11)*D19))
    var Power = Round((Peak * RateOn) + ((OffPeak + Holiday) * RateOff));

    var Base = Round(NeedPower + Power + Service);

    var FT = Round((Peak + OffPeak + Holiday) * (FT_ / 100)); //=ROUND(SUM(C9:C11)*C12/100,2)
    var VAT = Round((Base + FT) * nowVAT); //=ROUND((E23+E25)*0.07,2)
    var Summary = Base + FT + VAT;

    $("#txtResultNeedPower").autoNumeric('set', NeedPower);
    $("#txtResultPower").autoNumeric('set', Power);
    $("#txtResultService").autoNumeric('set', Service);
    $("#txtResultBase").autoNumeric('set', Base);
    $("#txtResultFT").autoNumeric('set', FT);
    $("#txtResultVat").autoNumeric('set', VAT);
    $("#txtResultSummary").autoNumeric('set', Summary);

    //Check if Discount 3% Valid
    Discount003Section(Summary);
}