using Azure.Identity;
using Jambiz.Advent.Api;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);
builder.ConfigureFunctionsWebApplication();
string Required(string name) => builder.Configuration[name] is { Length: > 0 } value
    ? value : throw new InvalidOperationException($"{name} is required.");
var tenant = Required("Authentication:TenantId");
var audience = Required("Authentication:Audience");
_ = Required("Authentication:SpaClientId");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    options.Authority = $"https://login.microsoftonline.com/{tenant}/v2.0";
    options.Audience = audience;
    options.TokenValidationParameters.ValidIssuer = $"https://login.microsoftonline.com/{tenant}/v2.0";
    options.TokenValidationParameters.ClockSkew = TimeSpan.FromMinutes(1);
});
builder.Services.AddSingleton(new CosmosClient(Required("Cosmos:Endpoint"), new DefaultAzureCredential(),
    new CosmosClientOptions { UseSystemTextJsonSerializerWithOptions = new(System.Text.Json.JsonSerializerDefaults.Web) }));
builder.Services.AddSingleton<CalendarStore>();
builder.Build().Run();
