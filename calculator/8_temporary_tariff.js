function Calculate08(Unit) {

    var Rate = 6.8025;

    //-------------- Calculate & Display Result --------------

    var Service = 0.00;
    var FT_ = GetFT();

    var Power = Round(Unit * Rate);
    var Base = Round(Power + Service);
    var FT = Round(Unit * (FT_ / 100)); //=ROUND($C$3*$C$4/100,2)
    var VAT = Round((Base + FT) * nowVAT); //=ROUND((D9+D11)*0.07,2)
    var Summary = Base + FT + VAT;

    $("#txtResultPower").autoNumeric('set', Power);
    $("#txtResultService").autoNumeric('set', Service);
    $("#txtResultBase").autoNumeric('set', Base);
    $("#txtResultFT").autoNumeric('set', FT);
    $("#txtResultVat").autoNumeric('set', VAT);
    $("#txtResultSummary").autoNumeric('set', Summary);

    //Check if Discount 3% Valid
    Discount003Section(Summary);
}
